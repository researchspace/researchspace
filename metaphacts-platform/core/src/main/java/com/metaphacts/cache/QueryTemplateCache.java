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

import java.util.Set;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.rest.client.APICallFailedException;
import com.metaphacts.api.rest.client.QueryCatalogAPIClient;
import com.metaphacts.api.rest.client.QueryCatalogAPIClientImpl;
import com.metaphacts.api.rest.client.QueryTemplateCatalogAPIClient;
import com.metaphacts.api.rest.client.QueryTemplateCatalogAPIClientImpl;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.data.rdf.container.LDPApiInternalRegistry;
import com.metaphacts.data.rdf.container.LocalLDPAPIClient;
import com.metaphacts.data.rdf.container.QueryTemplateContainer;
import com.metaphacts.repository.RepositoryManager;

@Singleton
public class QueryTemplateCache implements PlatformCache {

    private static final Logger logger = LogManager.getLogger(QueryTemplateCache.class);
    protected Cache<IRI, QueryTemplate<?>> queryTemplateCache = CacheBuilder.newBuilder()
            .maximumSize(5).expireAfterAccess(5, TimeUnit.MINUTES).build();

    protected LDPApiInternalRegistry ldpCache;
    protected NamespaceRegistry namespaceRegistry;

    @Inject
    public QueryTemplateCache(LDPApiInternalRegistry ldpCache, NamespaceRegistry namespaceRegistry,
            CacheManager cacheManager)
            throws Exception {
        this.ldpCache = ldpCache;
        this.namespaceRegistry = namespaceRegistry;
        cacheManager.register(this);
    }

    public QueryTemplate<?> getQueryTemplate(IRI key) throws Exception {
        // return from cache if possible
        if (queryTemplateCache.getIfPresent(key) != null) {
            return queryTemplateCache.getIfPresent(key);
        }

        QueryTemplate<?> result;

        try {
            result = this.getApiClient().getQueryTemplate(key);
        } catch (APICallFailedException e) {
            logger.error("Could not retrieve a query template with ID " + key.stringValue());
            logger.debug("Details: ", e);
            throw e;
        }

        queryTemplateCache.put(key, result);
        return result;
    }

    /**
     * Method made public to support JUnit tests.
     * 
     * @throws Exception
     */
    public QueryTemplateCatalogAPIClient getApiClient() throws Exception {
        LDPApiInternal assetsApi = ldpCache.api(RepositoryManager.ASSET_REPOSITORY_ID);

        LocalLDPAPIClient ldpAPIClient = new LocalLDPAPIClient(assetsApi,
                QueryTemplateContainer.IRI);

        QueryCatalogAPIClient queryCatalogApi = new QueryCatalogAPIClientImpl(ldpAPIClient,
                namespaceRegistry.getPrefixMap());

        return new QueryTemplateCatalogAPIClientImpl(ldpAPIClient, queryCatalogApi);
    }

    @Override
    public void invalidate() {
        queryTemplateCache.invalidateAll();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        queryTemplateCache.invalidateAll(iris);
    }

    @Override
    public String getId() {
        return "QueryTemplateCache";
    }
}
