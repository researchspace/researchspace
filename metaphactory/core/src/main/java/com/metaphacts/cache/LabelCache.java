/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.cache;

import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.google.common.collect.Iterables;
import com.metaphacts.repository.RepositoryManager;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.repository.Repository;

import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.groups.UIConfiguration;

/**
 * Extraction and caching logics for batched access to URI labels, according
 * to the specification in {@link UIConfiguration#getPreferredLabels()} and
 * {@link UIConfiguration#getPreferredLanguages()}. The label cache maps IRIs
 * to Optional<Literal>. As it is not guaranteed that a literal for a given
 * IRI is present in the repo (i.e., the Optional may be not present),
 * the caller should use the the LabelCache's method
 * {@link LabelCache#resolveLabelWithFallback(Optional, IRI)} in order to
 * safely get a display string for a given Optional + the IRI.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Michael Schmidt <ms@metaphacts.com>
 *
 */
@Singleton
public class LabelCache {
    private NamespaceRegistry ns;
    private Configuration config;
    private RepositoryManager repositoryManager;

    private ResourcePropertyCache<Literal> cache = new ResourcePropertyCache<Literal>("LabelCache") {
        /**
         * Extracts the preferred labels for a given IRI according to the specs
         * in {@link UIConfiguration#getPreferredLabels()} and
         * {@link UIConfiguration#getPreferredLanguages()}.
         *
         * @param repository the repository in which the label is extracted
         * @param iris the IRIs for which the label is extracted
         * @return the list of preferred literals, where index positions correspond
         *          to the index positions of the labels in the incoming list
         */
        @Override
        protected Map<IRI, Optional<Literal>> queryAll(Repository repository, Iterable<? extends IRI> iris) {
            // note: preferredLabels must not be empty by check in UIConfiguration.assertConsistency()

            // short path: if there are no IRIs to be looked up, return the empty map
            if (Iterables.isEmpty(iris)) {
                return Collections.emptyMap();
            }

            try {
                // convert to IRI list (filtering out invalid IRIs)
                List<IRI> preferredLabels = resolveIRIList(ns, config.getUiConfig().getPreferredLabels());

                String queryString = constructPropertyQuery(iris, preferredLabels);

                // for each input IRI we map to a list of lists of literal, where
                // (1) the outer list represents the predicate index and
                // (2) the inner list contains the labels for this predicate index
                // -> note this is done in a single pass (linear time & space w.r.t. result_
                Map<IRI, List<List<Literal>>> iriToListList = queryAndExtractProperties(
                    repository, queryString, preferredLabels.size(),
                    value -> value instanceof Literal ? Optional.of((Literal)value) : Optional.empty());

                // next, we flatten the inner list of list structure into one continuous list,
                // making sure that we have one entry per IRI
                Map<IRI, List<Literal>> iriToList = new HashMap<>();
                for (IRI iri : iris) {
                    List<List<Literal>> values = iriToListList.get(iri);
                    iriToList.put(iri, flattenProperties(values));
                }

                // extract the preferred literals based on language tag information
                return chooseLabelsWithPreferredLanguage(iriToList);

            } catch (Exception e) {
                throw new RuntimeException("Failed to query for label of IRI(s).", e);
            }
        }
    };

    @Inject
    public LabelCache(
        Configuration config,
        NamespaceRegistry ns,
        RepositoryManager repositoryManager,
        CacheManager cacheManager
    ) {
        this.config = config;
        this.ns = ns;
        this.repositoryManager = repositoryManager;
        cacheManager.register(cache);
    }

    /**
     * Extracts label of specified resource from specified repository.
     *
     * @param resourceIri IRI of resource to extract label for.
     * @return Label of resource if found in the specified repository;
     * otherwise {@link Optional#empty}.
     */
    public Optional<Literal> getLabel(IRI resourceIri, Repository repository) {
        return getLabels(Collections.singletonList(resourceIri), repository).get(resourceIri);
    }

    /**
     * Extracts labels of specified resources from specified repository.
     *
     * @param resourceIris IRIs of resources to extract labels for.
     * @return Immutable map from IRI to label. If label was not found
     * it would be still present as {@link Optional#empty}.
     */
    public Map<IRI, Optional<Literal>> getLabels(Iterable<? extends IRI> resourceIris, Repository repository) {
        return cache.getAll(repository, resourceIris);
    }

    /**
     * Wrapper that applies chooseLabelWithPreferredLanguage method to every member
     * of a literal list list, reducing each of the list to the literal with the best
     * matching label.
     */
    private Map<IRI, Optional<Literal>> chooseLabelsWithPreferredLanguage(
        final Map<IRI,List<Literal>> labelCandidatesMap) {

        final Map<IRI,Optional<Literal>> labelMap = new HashMap<>(labelCandidatesMap.size());

        for (final IRI key : labelCandidatesMap.keySet()) {

            labelMap.put(key, chooseLabelWithPreferredLanguage(labelCandidatesMap.get(key)));
        }

        return labelMap;
    }


    /**
     * Chooses, from the incoming list of literals the label with the preferred
     * language as per {@link UIConfiguration#getPreferredLanguages()}. The
     * choice is defined by the following algorithm:
     *
     * 1.) We iterate over the preferred languages in order. The first literal
     * in the list matching the current language literal is returned.
     *
     * 2.) If no hash map entry exists for any of the preferred languages, as
     * a fall back solution we return a non-language tag literal, if present
     * (as we assume this to be most specific).
     *
     * 3.) If if no such label exists, we return the first one (thus making a
     * non-deterministic) random choice.
     *
     * 4.) If no label exists at all, null is returned.
     *
     * @return the most appropriate literal in the list according to the
     *          preferred language configuration
     */
    private Optional<Literal> chooseLabelWithPreferredLanguage(List<Literal> labels) {

        if (labels.isEmpty()) { // fast path: no labels detected
            return Optional.empty();
        }

        final Iterator<String> languageIt = config.getUiConfig().getPreferredLanguages().iterator();

        final Map<String, Integer> languageToRank = new HashMap<String,Integer>();

        Integer rank = 0; // lower rank means better, best rank is zero
        while (languageIt.hasNext()) {

            final String language = languageIt.next();

            if (!languageToRank.containsKey(language)) { // filters out duplicate

                languageToRank.put(language, rank++);
            }
        }

        // as a fallback, watch out for non-language tagged literals (which are
        // identified by the empty string ""); note that we only use this as
        // a fallback if the empty string is not explicitly a member of the
        // preferredLanguages configuration
        if (!languageToRank.containsKey("")) {

            languageToRank.put("", rank++);

        }

        Literal bestObserved = null;                // init: none
        int bestObservedRank = Integer.MAX_VALUE;   // init: none
        for (int i=0; i<labels.size(); i++) {

            final Literal label = labels.get(i);

            final Optional<String> language = label.getLanguage();

            final String languageNonOptional =
                language.isPresent() ? language.get() : "";

            final int curRank =
                languageToRank.containsKey(languageNonOptional) ?
                languageToRank.get(languageNonOptional) : Integer.MAX_VALUE-1 /* better than uninitialized*/;

            if (curRank==0) { // optimal match found

                return Optional.of(label);

            } else if (curRank<bestObservedRank) { // remember best match thus far

                bestObservedRank = curRank;
                bestObserved = label;

            } // else: continue scanning

        }

        return Optional.ofNullable(bestObserved); // no optimal match

    }

    /**
     * Returns the defined label for the IRI if the literal in the optional is present, otherwise
     * computing a fall back label. The fallback is the IRI's local name and if local name is empty,
     * it simply returns the full IRI as a string.
     *
     * @param labelIfDefined
     *            the Optional label (not necessarily present)
     * @param iri
     *            the IRI (used for fallback computation)
     *
     * @return the label
     * @throws IllegalArgumentException
     *             if the label is undefined and the IRI is null
     */
    public static String resolveLabelWithFallback(
        final Optional<Literal> labelIfDefined, final IRI iri) {

        if (labelIfDefined.isPresent()) {
            return labelIfDefined.get().stringValue();
        } else {

            if (iri==null) {
                throw new IllegalArgumentException("IRI must not be null");
            }

            final String localName = iri.getLocalName();
            if(!StringUtils.isEmpty(localName)){
                return localName;
            }
            return iri.stringValue();
        }
    }
}
