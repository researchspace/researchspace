/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository;

import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.federated.algebra.StatementSource;
import org.eclipse.rdf4j.federated.cache.SourceSelectionCache;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.federated.structures.SubQuery;
import org.junit.Test;
import org.researchspace.cache.CacheManager;

public class SourceSelectionPlatformCacheTest {

    private static class StubSourceSelectionCache implements SourceSelectionCache {

        boolean invalidated = false;

        @Override
        public StatementSourceAssurance getAssurance(SubQuery subQuery, Endpoint endpoint) {
            return StatementSourceAssurance.POSSIBLY_HAS_STATEMENTS;
        }

        @Override
        public void updateInformation(SubQuery subQuery, Endpoint endpoint, boolean hasStatements) {
        }

        @Override
        public void invalidate() {
            invalidated = true;
        }
    }

    /**
     * RepositoryManager.reinitializeRepositories initializes the new federation
     * instance (which registers its source selection cache) BEFORE the old
     * instance is shut down (which deregisters its cache). With a non-unique
     * cache ID the new registration fails and the old shutdown removes the
     * surviving entry, so writes stop invalidating source selection.
     */
    @Test
    public void reinitializationKeepsNewCacheRegistered() {
        CacheManager cacheManager = new CacheManager();
        StubSourceSelectionCache newDelegate = new StubSourceSelectionCache();
        SourceSelectionPlatformCache oldCache = new SourceSelectionPlatformCache(new StubSourceSelectionCache(),
                "default");
        SourceSelectionPlatformCache newCache = new SourceSelectionPlatformCache(newDelegate, "default");

        cacheManager.register(oldCache);
        cacheManager.register(newCache);
        cacheManager.deregister(oldCache);

        cacheManager.invalidateAll();
        assertTrue("invalidation must reach the new federation instance's source selection cache",
                newDelegate.invalidated);
    }
}
