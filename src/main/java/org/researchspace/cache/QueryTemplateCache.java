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

package org.researchspace.cache;

import java.util.Set;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.QueryCatalogAPIClient;
import org.researchspace.api.rest.client.QueryCatalogAPIClientImpl;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClient;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClientImpl;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LDPApiInternalRegistry;
import org.researchspace.data.rdf.container.LocalLDPAPIClient;
import org.researchspace.data.rdf.container.QueryTemplateContainer;
import org.researchspace.repository.RepositoryManager;

import com.google.common.cache.Cache;

@Singleton
public class QueryTemplateCache implements PlatformCache {

    public static final String CACHE_ID = "platform.QueryTemplateCache";

    private static final Logger logger = LogManager.getLogger(QueryTemplateCache.class);
    protected final Cache<IRI, QueryTemplate<?>> queryTemplateCache;

    protected LDPApiInternalRegistry ldpCache;
    protected NamespaceRegistry namespaceRegistry;

    @Inject
    public QueryTemplateCache(LDPApiInternalRegistry ldpCache, NamespaceRegistry namespaceRegistry,
            CacheManager cacheManager) throws Exception {
        this.ldpCache = ldpCache;
        this.namespaceRegistry = namespaceRegistry;
        queryTemplateCache = cacheManager.newBuilder(CACHE_ID,
                cacheBuilder -> cacheBuilder.maximumSize(5).expireAfterAccess(5, TimeUnit.MINUTES)).build();
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

        LocalLDPAPIClient ldpAPIClient = new LocalLDPAPIClient(assetsApi, QueryTemplateContainer.IRI);

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
