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

package com.metaphacts.thumbnails;

import com.google.common.collect.Iterables;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.cache.ResourcePropertyCache;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.*;

/**
 * @author Alexey Morozov
 */
@Singleton
public class DefaultThumbnailService implements ThumbnailService {
    private Configuration config;
    private NamespaceRegistry ns;
    private ValueFactory valueFactory;

    private ResourcePropertyCache<IRI> cache = new ResourcePropertyCache<IRI>("DefaultThumbnailService") {
        @Override
        protected Map<IRI, Optional<IRI>> queryAll(Repository repository, Iterable<? extends IRI> iris) {
            if (Iterables.isEmpty(iris)) {
                return Collections.emptyMap();
            }

            try {
                List<IRI> thumbnailIRIs = resolveIRIList(ns, config.getUiConfig().getPreferredThumbnails());

                String query = constructPropertyQuery(iris, thumbnailIRIs);

                Map<IRI, List<List<IRI>>> iriToPredicateToThumbnail = queryAndExtractProperties(
                    repository, query, thumbnailIRIs.size(),
                    value -> {
                        if (value instanceof IRI) {
                            return Optional.of((IRI)value);
                        } else if (value instanceof Literal) {
                            return tryConvertToIRI((Literal)value);
                        } else {
                            return Optional.empty();
                        }
                    });

                Map<IRI, Optional<IRI>> thumbnails = new HashMap<>();
                for (IRI iri : iris) {
                    Optional<IRI> thumbnail = flattenProperties(iriToPredicateToThumbnail.get(iri))
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
        ThumbnailServiceRegistry thumbnailServiceRegistry,
        Configuration config,
        NamespaceRegistry ns,
        CacheManager cacheManager
    ) {
        this.config = config;
        this.ns = ns;
        this.valueFactory = SimpleValueFactory.getInstance();
        thumbnailServiceRegistry.register(this);
        cacheManager.register(cache);
    }

    @Override
    public String getThumbnailServiceName() {
        return "default";
    }

    @Override
    public Map<IRI, Optional<IRI>> getThumbnailIRIs(Repository repository, Iterable<? extends IRI> resourceIRIs) {
        return cache.getAll(repository, resourceIRIs);
    }

    private Optional<IRI> tryConvertToIRI(Literal literal) {
        try {
            IRI iri = valueFactory.createIRI(literal.stringValue());
            return Optional.of(iri);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
