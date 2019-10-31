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

package com.metaphacts.thumbnails;

import com.google.common.collect.Iterables;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.config.PropertyPattern;
import com.metaphacts.cache.ResourcePropertyCache;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.repository.Repository;

import javax.inject.Inject;
import javax.inject.Singleton;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * @author Alexey Morozov
 */
@Singleton
public class DefaultThumbnailService implements ThumbnailService {
    private Configuration config;
    private NamespaceRegistry namespaceRegistry;

    private ResourcePropertyCache<IRI, Value> cache = new ResourcePropertyCache<IRI, Value>("DefaultThumbnailService") {
        @Override
        protected IRI keyToIri(IRI iri) {
            return iri;
        }

        @Override
        protected Map<IRI, Optional<Value>> queryAll(Repository repository, Iterable<? extends IRI> iris) {
            if (Iterables.isEmpty(iris)) {
                return Collections.emptyMap();
            }

            List<String> preferredThumbnails = config.getUiConfig().getPreferredThumbnails();
            try {
                List<PropertyPattern> thumbnailPatterns = preferredThumbnails.stream()
                    .map(pattern -> PropertyPattern.parse(pattern, namespaceRegistry))
                    .collect(Collectors.toList());

                String query = constructPropertyQuery(iris, thumbnailPatterns);

                Map<IRI, List<List<Value>>> iriToPredicateToThumbnail = queryAndExtractProperties(
                    repository, query, thumbnailPatterns.size(),
                    value -> {
                        if (value != null) {
                            return Optional.of(value);
                        } else {
                            return Optional.empty();
                        }
                    });

                Map<IRI, Optional<Value>> thumbnails = new HashMap<>();
                for (IRI iri : iris) {
                    Optional<Value> thumbnail = flattenProperties(iriToPredicateToThumbnail.get(iri))
                        .stream().findFirst();
                    thumbnails.put(iri, thumbnail);
                }

                return thumbnails;
            } catch (Exception ex) {
                throw new RuntimeException("Failed to query for thumbnails of IRI(s).", ex);
            }
        }
    };

    @Inject
    public DefaultThumbnailService(
        Configuration config,
        NamespaceRegistry namespaceRegistry,
        ThumbnailServiceRegistry thumbnailServiceRegistry,
        CacheManager cacheManager
    ) {
        this.config = config;
        this.namespaceRegistry = namespaceRegistry;
        thumbnailServiceRegistry.register(this);
        cacheManager.register(cache);
    }

    @Override
    public String getThumbnailServiceName() {
        return "default";
    }

    @Override
    public Map<IRI, Optional<Value>> getThumbnails(Repository repository, Iterable<? extends IRI> resourceIRIs) {
        return cache.getAll(repository, resourceIRIs);
    }
}
