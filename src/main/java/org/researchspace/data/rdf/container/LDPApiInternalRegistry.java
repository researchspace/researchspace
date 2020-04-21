/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.data.rdf.container;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;
import javax.inject.Provider;
import javax.inject.Singleton;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistry;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;

import com.google.common.cache.Cache;

/**
 * Registry for maintaining {@link LDPApiInternal} instances.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
@Singleton
public class LDPApiInternalRegistry {

    public static final String CACHE_ID = "platform.ldp.ApiInternalRegistry";

    private static final Logger logger = LogManager.getLogger(QueryCatalogRESTServiceRegistry.class);

    @Inject
    private NamespaceRegistry namespaceRegistry;

    @Inject
    private Provider<RepositoryManager> repositoryManagerProvider;

    protected final Cache<String, LDPApiInternal> ldpCache;

    @Inject
    public LDPApiInternalRegistry(CacheManager cacheManager) {
        ldpCache = cacheManager.newBuilder(CACHE_ID,
                cacheBuilder -> cacheBuilder.maximumSize(5).expireAfterAccess(30, TimeUnit.MINUTES)).build();
    }

    public void invalidate() {
        ldpCache.invalidateAll();
    }

    public void invalidate(List<String> repos) {
        ldpCache.invalidateAll(repos);
    }

    public LDPApiInternal api(String repositoryId) {
        final String repId = Optional.ofNullable(repositoryId).orElse(RepositoryManager.ASSET_REPOSITORY_ID);
        try {

            return ldpCache.get(repId, new Callable<LDPApiInternal>() {
                @Override
                public LDPApiInternal call() {
                    logger.debug("Creating new LDPApi instance for repository \"{}\".", repId);
                    return new LDPApiInternal(new MpRepositoryProvider(repositoryManagerProvider.get(), repId),
                            namespaceRegistry);
                }
            });
        } catch (ExecutionException e) {
            // This exception should never be thrown
            // But in case if something happens, we just send a newly created API instance.
            return new LDPApiInternal(new MpRepositoryProvider(repositoryManagerProvider.get(), repId),
                    namespaceRegistry);
        }
    }

}
