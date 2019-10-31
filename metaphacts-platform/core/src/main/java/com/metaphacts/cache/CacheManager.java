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

import static java.util.stream.Collectors.toList;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;

import com.google.common.collect.Lists;
import com.google.inject.Singleton;

/**
 * @author Michael Schmidt <ms@metaphacts.com>
 */
@Singleton
public class CacheManager {
    private static final Logger logger = LogManager.getLogger(CacheManager.class);
    private final Map<String, PlatformCache> instances = new HashMap<>();

    public void register(PlatformCache cache) {
        String cacheId = cache.getId();
        logger.debug("Registering cache '{}' in CacheManager.", cacheId);
        if (instances.containsKey(cacheId)) {
            throw new IllegalStateException(String.format(
                "CacheManager has already an cache with ID '%s'.", cacheId));
        } else {
            instances.put(cacheId, cache);
        }
    }
    
    /**
     * Removes all registered cache instances (for test purposes only!)
     */
    public void deregisterAllCaches() {
        instances.clear();
    }
    
    /**
     * @return a list of IDs of caches that have been invalidated
     */
    public List<String> invalidateAll() {
        if (logger.isDebugEnabled()) {
            logger.debug("Invalidating the following caches: {}", instances);
        }
        ArrayList<String> l = Lists.newArrayList();
        for (PlatformCache cache : instances.values()) {
            cache.invalidate();
            l.add(cache.getId());
        }
        return l;
    }

    /**
     * Purges specific resources from all caches.
     * @param resources List of resources to purge from all caches
     */
    public void invalidateResources(Set<IRI> resources) {
        if (logger.isDebugEnabled()) {
            logger.debug("Invalidating the following resources: {}", String.join(
                ", ", resources.stream().map(IRI::toString).collect(toList())));
        }
        for (PlatformCache cache : instances.values()) {
            cache.invalidate(resources);
        }
    }
}
