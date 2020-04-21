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

package org.researchspace.querycatalog;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.io.FilenameUtils;
import org.junit.Rule;
import org.junit.rules.TemporaryFolder;
import org.researchspace.api.rest.client.QueryCatalogAPIClient;
import org.researchspace.api.rest.client.QueryCatalogAPIClientImpl;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClientImpl;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LocalLDPAPIClient;
import org.researchspace.data.rdf.container.QueryTemplateContainer;
import org.researchspace.junit.NamespaceRule;
import org.researchspace.junit.TestPlatformStorage;
import org.researchspace.querycatalog.QaasField;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistry;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import com.google.inject.Inject;
import com.google.inject.Singleton;

@Singleton
public class QueryCatalogRESTServiceRegistryRule extends TemporaryFolder {
    @Inject
    public TestPlatformStorage platformStorage;

    @Inject
    public QueryCatalogRESTServiceRegistry registry;

    @Inject
    public RepositoryManager repositoryManager;

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    public QueryCatalogRESTServiceRegistry getRegistry() {
        return registry;
    }

    public void registerServiceFromPropertiesFile(File propFile) throws ConfigurationException {
        String serviceId = FilenameUtils.getBaseName(propFile.getName());
        try (FileInputStream content = new FileInputStream(propFile)) {
            long contentLength = content.getChannel().size();
            platformStorage.getMainStorage().appendObject(
                    QueryCatalogRESTServiceRegistry.objectIdFromServiceId(serviceId),
                    platformStorage.getDefaultMetadata(), content, contentLength);
            registry.syncServices();
        } catch (IOException e) {
            throw new ConfigurationException(e);
        }
    }

    public void setServiceParameter(String serviceId, QaasField field, String value) throws ConfigurationException {
        Map<QaasField, String> parameters = new HashMap<>();
        parameters.put(field, value);
        registry.addOrUpdateService(serviceId, parameters, TestPlatformStorage.STORAGE_ID);
    }

    public void setLDPRepository(String repositoryId) {
        LDPApiInternal assetsApi = new LDPApiInternal(new MpRepositoryProvider(repositoryManager, repositoryId),
                namespaceRule.getNamespaceRegistry());
        LocalLDPAPIClient ldpAPIClient = new LocalLDPAPIClient(assetsApi, QueryTemplateContainer.IRI);

        QueryCatalogAPIClient queryCatalogApi = new QueryCatalogAPIClientImpl(ldpAPIClient);

        registry.queryTemplateCatalogApiClient = new QueryTemplateCatalogAPIClientImpl(ldpAPIClient, queryCatalogApi);
    }

    public void deleteAll() throws ConfigurationException {
        for (String serviceId : registry.listServiceIds()) {
            registry.deleteService(serviceId, TestPlatformStorage.STORAGE_ID);
        }
    }
}
