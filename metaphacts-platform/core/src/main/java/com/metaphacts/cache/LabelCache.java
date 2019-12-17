/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import javax.annotation.Nullable;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.repository.Repository;

import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Iterables;
import com.google.common.collect.Maps;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.PropertyPattern;
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

    public static final String CACHE_ID = "repository.LabelCache";

    private Configuration config;
    private NamespaceRegistry namespaceRegistry;
    private final CacheManager cacheManager;

    private static class CacheKey {
        public final IRI iri;
        public final String languageTag;

        public CacheKey(IRI iri, String languageTag) {
            this.iri = iri;
            this.languageTag = languageTag;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            CacheKey cacheKey = (CacheKey) o;
            return Objects.equals(iri, cacheKey.iri) &&
                Objects.equals(languageTag, cacheKey.languageTag);
        }

        @Override
        public int hashCode() {
            return Objects.hash(iri, languageTag);
        }
    }

    private ResourcePropertyCache<CacheKey, Literal> cache = new ResourcePropertyCache<CacheKey, Literal>(CACHE_ID) {
        @Override
        protected IRI keyToIri(CacheKey key) {
            return key.iri;
        }
        
        /**
         * Provide customized cache specification for label cache
         */
        @Override
        protected CacheBuilder<Object,Object> createCacheBuilder() {
            return cacheManager.newBuilder(CACHE_ID,
                    cacheBuilder -> cacheBuilder.maximumSize(100000).expireAfterAccess(6, TimeUnit.HOURS));
        };

        /**
         * Extracts the preferred labels for a given IRI according to the specs
         * in {@link UIConfiguration#getPreferredLabels()} and
         * {@link UIConfiguration#getPreferredLanguages()}.
         *
         * @param repository the repository in which the label is extracted
         * @param keys (IRI, languageTag) tuples for which the label is extracted
         * @return the list of preferred literals, where index positions correspond
         *          to the index positions of the labels in the incoming list
         */
        @Override
        protected Map<CacheKey, Optional<Literal>> queryAll(Repository repository, Iterable<? extends CacheKey> keys) {
            // note: preferredLabels must not be empty by check in UIConfiguration.assertConsistency()

            // short path: if there are no IRIs to be looked up, return the empty map
            if (Iterables.isEmpty(keys)) {
                return Collections.emptyMap();
            }

            int batchSize = 1000;
            int numberOfThreads = 5;

            // if less than batch size items are requested, immediately execute
            if (keys instanceof Collection<?> && ((Collection<?>) keys).size() <= batchSize) {
                return queryAllBatched(repository, keys);
            }

            Map<CacheKey, Optional<Literal>> res = Maps.newConcurrentMap();
            ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
            try {
                StreamSupport.stream(Iterables.partition(keys, batchSize).spliterator(), false).forEach(batch -> {
                    executorService.execute(() -> res.putAll(queryAllBatched(repository, batch)));
                });
            } finally {
                executorService.shutdown();
                try {
                    executorService.awaitTermination(30, TimeUnit.SECONDS);
                } catch (InterruptedException e1) {
                    logger.warn("Failed to wait for label computation: " + e1.getMessage());
                    executorService.shutdownNow();
                    throw new RuntimeException("Timeout while querying repository for labels", e1);
                }
            }

            return res;
        }
        
        /**
         * Batched variant of {@link #queryAll(Repository, Iterable)}.
         * 
         * @param repository
         * @param keys
         * @return
         * @see #queryAll(Repository, Iterable)
         */
        private Map<CacheKey, Optional<Literal>> queryAllBatched(Repository repository,
                Iterable<? extends CacheKey> keys) {
            List<String> preferredLabels = config.getUiConfig().getPreferredLabels();
            try {
                // convert to IRI list (filtering out invalid IRIs)
                List<PropertyPattern> labelPatterns = preferredLabels.stream()
                    .map(pattern -> PropertyPattern.parse(pattern, namespaceRegistry))
                    .collect(Collectors.toList());

                Iterable<IRI> iris = Iterables.transform(keys, key -> key.iri);
                String queryString = constructPropertyQuery(iris, labelPatterns);

                // for each input IRI we map to a list of lists of literal, where
                // (1) the outer list represents the predicate index and
                // (2) the inner list contains the labels for this predicate index
                // -> note this is done in a single pass (linear time & space w.r.t. result_
                Map<IRI, List<List<Literal>>> iriToListList = queryAndExtractProperties(
                    repository, queryString, preferredLabels.size(),
                    value -> value instanceof Literal ? Optional.of((Literal)value) : Optional.empty());

                // next, we flatten the inner list of list structure into one continuous list,
                // making sure that we have one entry per IRI
                Map<CacheKey, List<Literal>> literalByKey = new HashMap<>();
                for (CacheKey key : keys) {
                    List<List<Literal>> literals = iriToListList.get(key.iri);
                    literalByKey.put(key, flattenProperties(literals));
                }

                // extract the preferred literals based on language tag information
                return chooseLabelsWithPreferredLanguage(literalByKey);

            } catch (Exception e) {
                throw new RuntimeException("Failed to query for label of IRI(s).", e);
            }
        }
    };

    @Inject
    public LabelCache(
        Configuration config,
        NamespaceRegistry namespaceRegistry,
        CacheManager cacheManager
    ) {
        this.config = config;
        this.namespaceRegistry = namespaceRegistry;
        this.cacheManager = cacheManager;
        cacheManager.register(cache);
    }

    /**
     * Extracts label of specified resource from specified repository.
     *
     * @param resourceIri IRI of resource to extract label for.
     * @return Label of resource if found in the specified repository;
     * otherwise {@link Optional#empty}.
     */
    public Optional<Literal> getLabel(
        IRI resourceIri,
        Repository repository,
        @Nullable String preferredLanguage
    ) {
        return getLabels(
            Collections.singletonList(resourceIri), repository, preferredLanguage
        ).get(resourceIri);
    }

    /**
     * Extracts labels of specified resources from specified repository.
     *
     * @param resourceIris IRIs of resources to extract labels for.
     * @return Immutable map from IRI to label. If label was not found
     * it would be still present as {@link Optional#empty}.
     */
    public Map<IRI, Optional<Literal>> getLabels(
        Iterable<? extends IRI> resourceIris,
        Repository repository,
        @Nullable String preferredLanguage
    ) {
        String languageTag = config.getUiConfig().resolvePreferredLanguage(preferredLanguage);

        Iterable<CacheKey> keys = StreamSupport
            .stream(resourceIris.spliterator(), false)
            .map(iri -> new CacheKey(iri, languageTag))
            .collect(Collectors.toList());

        Map<IRI, Optional<Literal>> result = new HashMap<>();
        cache.getAll(repository, keys).forEach(
            (key, literal) -> result.put(key.iri, literal)
        );
        return result;
    }

    /**
     * Wrapper that applies chooseLabelWithPreferredLanguage method to every member
     * of a literal list list, reducing each of the list to the literal with the best
     * matching label.
     */
    private Map<CacheKey, Optional<Literal>> chooseLabelsWithPreferredLanguage(
        Map<CacheKey, List<Literal>> labelCandidates
    ) {
        List<String> systemPreferredLanguages = config.getUiConfig().getPreferredLanguages();

        Map<CacheKey, Optional<Literal>> chosenLabels = new HashMap<>(labelCandidates.size());

        labelCandidates.forEach((key, literals) -> {
            Optional<Literal> chosen = chooseLabelWithPreferredLanguage(
                literals, key.languageTag, systemPreferredLanguages);
            chosenLabels.put(key, chosen);
        });

        return chosenLabels;
    }


    /**
     * Chooses, from the incoming list of literals the label with the preferred
     * language as per {@link UIConfiguration#getPreferredLanguages()}. The
     * choice is defined by the following algorithm:
     *
     * 0.) Make languages ranking list equal to concat(selectedLanguage, preferredLanguages).
     *
     * 1.) We iterate over the languages ranking list in order. The first literal
     * in the list matching the current language tag is returned.
     *
     * 2.) If no hash map entry exists for any of the languages in the list, as
     * a fall back solution we return a non-language tag literal, if present
     * (as we assume this to be most specific).
     *
     * 3.) If if no such label exists, we return the first one (thus making a
     * non-deterministic) random choice.
     *
     * 4.) If no label exists at all, null is returned.
     *
     * @return the most appropriate literal in the list according to the selected language
     *         and the preferred language configuration
     */
    private Optional<Literal> chooseLabelWithPreferredLanguage(
        List<Literal> labels,
        String selectedLanguage,
        List<String> otherPreferredLanguages
    ) {
        if (labels.isEmpty()) { // fast path: no labels detected
            return Optional.empty();
        }

        Map<String, Integer> languageToRank = new HashMap<>();
        languageToRank.put(selectedLanguage, 0);

        int nextRank = 1; // lower rank means better, best rank is zero
        for (String language : otherPreferredLanguages) {
            if (!languageToRank.containsKey(language)) { // filters out duplicate
                languageToRank.put(language, nextRank++);
            }
        }

        // as a fallback, watch out for non-language tagged literals (which are
        // identified by the empty string ""); note that we only use this as
        // a fallback if the empty string is not explicitly a member of the
        // preferredLanguages configuration
        if (!languageToRank.containsKey("")) {
            languageToRank.put("", nextRank++);
        }

        Literal bestObserved = null;                // init: none
        int bestObservedRank = Integer.MAX_VALUE;   // init: none
        for (Literal label : labels) {
            Optional<String> language = label.getLanguage();

            String languageNonOptional = language.orElse("");

            int curRank = languageToRank.getOrDefault(
                languageNonOptional,
                Integer.MAX_VALUE - 1 /* better than uninitialized*/
            );

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
