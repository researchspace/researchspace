/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository;

import java.util.Set;

import org.eclipse.rdf4j.federated.cache.SourceSelectionCache;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.cache.PlatformCache;

/**
 * Adapter that registers FedX's {@link SourceSelectionCache} with the platform
 * {@link org.researchspace.cache.CacheManager} so it is invalidated whenever
 * data is written (SPARQL UPDATE, form persistence, LDP, etc.).
 *
 * <p>This avoids stale source selection results where FedX remembers that an
 * endpoint had no data for a particular pattern, even after data has been
 * inserted.</p>
 *
 * <p>The cache ID is unique per federation instance to allow multiple
 * federations to register independently.</p>
 */
public class SourceSelectionPlatformCache implements PlatformCache {

    private static final String CACHE_ID_PREFIX = "federation.SourceSelectionCache.";

    private final SourceSelectionCache delegate;
    private final String cacheId;

    /**
     * @param delegate      the FedX source selection cache to wrap
     * @param federationId  unique identifier for the federation instance (e.g. repository ID)
     */
    public SourceSelectionPlatformCache(SourceSelectionCache delegate, String federationId) {
        this.delegate = delegate;
        this.cacheId = CACHE_ID_PREFIX + federationId;
    }

    @Override
    public void invalidate() {
        delegate.invalidate();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        // Cannot map IRIs to SubQuery cache keys, so full invalidation
        delegate.invalidate();
    }

    @Override
    public String getId() {
        return cacheId;
    }
}
