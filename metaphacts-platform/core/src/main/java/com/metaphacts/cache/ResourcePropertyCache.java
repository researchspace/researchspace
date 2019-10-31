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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;

import com.google.common.base.Throwables;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.config.PropertyPattern;

/**
 * Cache with extraction logic for batched access to some property of a resource.
 * (?subject ?predicate ?object) triple corresponds to (resource property property-value).
 *
 * @param <Property> Type of cached property value (e.g. IRI or Literal).
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 * @author Alexey Morozov
 */
public abstract class ResourcePropertyCache<Key, Property> implements PlatformCache {
    protected final Logger logger = LogManager.getLogger(this);

    private final Map<Repository, LoadingCache<Key, Optional<Property>>> repositoryMap  = Maps.newConcurrentMap();

    private final String cacheId;

    public ResourcePropertyCache(String cacheId) {
        this.cacheId = cacheId;
    }

    protected abstract IRI keyToIri(Key key);
    protected abstract Map<Key, Optional<Property>> queryAll(Repository repository, Iterable<? extends Key> iris);

    @Override
    public String getId() {
        return cacheId;
    }

    public final Map<Key, Optional<Property>> getAll(Repository repository, Iterable<? extends Key> resourceIRIs) {
        initializeCache(repository);
        try {
            // obtain iri-to-property map
            return repositoryMap.get(repository).getAll(resourceIRIs);
        } catch (ExecutionException e) {
            logger.warn("Execution error while populating cache: " + e.getMessage());
            throw Throwables.propagate(e);
        }
    }

    private void initializeCache(Repository repository) {
        if (repositoryMap.containsKey(repository)) { return; }

        logger.debug("Initializing cache for repository: {}", repository);
        repositoryMap.put(repository,
            CacheBuilder.newBuilder()
            .maximumSize(1000)
            .expireAfterAccess(30, TimeUnit.MINUTES)
            .build(new CacheLoader<Key, Optional<Property>>() {
                @Override
                public Optional<Property> load(Key key) {
                    return queryAll(repository, Collections.singletonList(key)).get(key);
                }

                @Override
                public Map<Key, Optional<Property>> loadAll(Iterable<? extends Key> keys) throws Exception {
                    return queryAll(repository, keys);
                }
            })
        );
    }

    @Override
    public void invalidate() {
        repositoryMap.values().forEach(Cache::invalidateAll);
        repositoryMap.clear();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        repositoryMap.values().forEach(cache -> {
            List<Key> keysToInvalidate = cache.asMap().keySet().stream()
                .filter(key -> iris.contains(keyToIri(key)))
                .collect(Collectors.toList());
            cache.invalidateAll(keysToInvalidate);
        });
    }

    /**
     * Constructs a query that extracts the property values for all properties in the
     * preferredProperties input list and the given IRIs as input.
     *
     * The query looks as follows:
     *
     * <code>
     * SELECT ?subject ?p0 ... ?pn WHERE {
     *   { ?subject [labelProp0] ?p0 .
     *     VALUES (?subject) { ([iri0]) ... ([iriM]) } }
     *   UNION { ?subject [labelProp1] ?p1 .
     *           VALUES (?subject) { ([iri0]) ... ([iriM]) } }
     *   ...
     *   UNION { ?subject [labelPropn] ?pn .
     *           VALUES (?subject) { ([iri0]) ... ([iriM]) } }
     * }
     * </code>
     *
     * , i.e. the ?pi variables denote by their index the position of the
     * respective property in the preferredProperties list (e.g., ?p0 will
     * contain bindings for preferredProperties.get(0)), whereas the values are
     * injected via VALUES clause.
     *
     * @param iris the input IRIs to resolve
     * @param preferredProperties the list of preferred properties
     * @return the query string for result extraction
     */
    protected static String constructPropertyQuery(
        Iterable<? extends IRI> iris, List<PropertyPattern> preferredProperties) {

        // build query value injection clause
        StringBuilder valuesClauseBuilder = new StringBuilder()
            .append("VALUES (?subject) { ");
        for (IRI iri : iris) {
            valuesClauseBuilder.append("(<").append(iri.stringValue()).append(">)");
        }
        valuesClauseBuilder.append(" }");

        String valuesClause = valuesClauseBuilder.toString();
        StringBuilder queryString = new StringBuilder();

        // build query header
        queryString.append("SELECT ?subject");
        for (int i = 0; i < preferredProperties.size(); i++) {
            queryString.append(" ?p").append(i);
        }

        // build query body
        queryString.append(" WHERE {");

        int predicateIdx = 0;
        for (PropertyPattern preferredProperty : preferredProperties) {
            if (predicateIdx > 0) {
                queryString.append("UNION");
            }

            // ?subject [PREDICATE] ?p[PREDICATE_IDX]
            queryString.append("{")
                .append(preferredProperty.format("subject", "p" + predicateIdx))
                .append(valuesClause)
                .append("}");

            predicateIdx++;
        }

        queryString.append("} ");

        return queryString.toString();
    }

    /**
     * Executes the queryString over the repository and collects property values.
     * More precisely, for each input IRI we map to a list of lists of values, where
     * (1) the outer list represents the predicate index and
     * (2) the inner list contains the property values for this predicate index
     *
     * The extraction is done efficient in a single pass
     * (linear time & space w.r.t. result size).
     *
     * @param repository the repo over which to execute the query
     * @param queryString the query string (constructed by {@link #constructPropertyQuery(Iterable, List)})
     * @param propertyCount the count of properties in query
     * @param extractProperty the function to get property value from Sparql query result binding value
     * @return the list in which we store the result
     */
    protected static <Property> Map<IRI, List<List<Property>>> queryAndExtractProperties(
        Repository repository, String queryString, int propertyCount,
        Function<Value, Optional<Property>> extractProperty
    ) {
        Map<IRI, List<List<Property>>> iriToPredicateToValues = new HashMap<>();

        final SparqlOperationBuilder<TupleQuery> op =
            SparqlOperationBuilder.create(queryString, TupleQuery.class);

        RepositoryConnection conn = null;
        try {
            conn = repository.getConnection();

            try (TupleQueryResult res = op.build(conn).evaluate()) {

                while(res.hasNext()){
                    final BindingSet b = res.next();
                    final IRI s = (IRI)b.getValue("subject"); // always bound by construction

                    // initially: create the IRI list, if inspecting IRIs for first time
                    if (!iriToPredicateToValues.containsKey(s)) {

                        // initialize list with empty lists
                        final List<List<Property>> predicateList = new ArrayList<>(propertyCount);
                        for (int i = 0; i < propertyCount; i++) {
                            predicateList.add(new ArrayList<>());
                        }

                        iriToPredicateToValues.put(s, predicateList);
                    }

                    // get the mapping to literals
                    final List<List<Property>> predicateToValues = iriToPredicateToValues.get(s);

                    // and store information carried by solution
                    final Set<String> bindingNames = b.getBindingNames();
                    for (final String bindingName : bindingNames) {

                        if (bindingName.equals("subject"))
                            continue; // skip

                        final Value v = b.getValue(bindingName);
                        extractProperty.apply(v).ifPresent(propertyValue -> {
                            // predicate value variables are labeled p0, p1, ...
                            final Integer predicateIndex = Integer.valueOf(bindingName.substring(1));
                            predicateToValues.get(predicateIndex).add(propertyValue);
                        });
                    }
                }
            }
        } finally {
            if (conn != null) {
                conn.close();
            }
        }

        return iriToPredicateToValues;
    }

    protected static <Property> List<Property> flattenProperties(List<List<Property>> propertyValues) {
        if (propertyValues == null) {
            return Lists.newArrayListWithCapacity(0);
        } else {
            return propertyValues.stream().flatMap(List::stream).collect(Collectors.toList());
        }
    }
}
