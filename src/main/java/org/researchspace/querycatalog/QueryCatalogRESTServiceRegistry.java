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

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.*;
import java.util.Map.Entry;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.annotation.Nullable;
import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClient;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.PlatformCache;
import org.researchspace.cache.QueryTemplateCache;
import org.researchspace.config.ConfigurationUtil;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.security.Permissions;
import org.researchspace.services.storage.api.*;

import com.google.common.base.Preconditions;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import static java.util.stream.Collectors.toList;

/**
 * A singleton implementation of a registry to store query templates exposed as
 * {@link QueryCatalogRESTService} REST API services.
 *
 * <p>
 * Assumes that the service descriptors are stored as objects at path
 * <code>config/qaas/*.prop</code> (see {@link QueryCatalogRESTService} for the
 * format of property files).
 * </p>
 *
 * <p>
 * Currently relies on the {@link LDPApiInternal} over the
 * {@link RepositoryManager#ASSET_REPOSITORY_ID} default assets repository
 * ({@link RepositoryManager#ASSET_REPOSITORY_ID}).
 * </p>
 *
 * @author Andriy Nikolov an@metaphacts.com
 */
@Singleton
public class QueryCatalogRESTServiceRegistry {
    protected static final StoragePath SERVICE_CONFIG_OBJECT_PREFIX = ObjectKind.CONFIG.resolve("qaas");

    private static final Logger logger = LogManager.getLogger(QueryCatalogRESTServiceRegistry.class);

    /**
     * Reference to a singleton {@link RepositoryManager} (injected via Guice).
     */
    protected final RepositoryManager repositoryManager;

    protected final PlatformStorage platformStorage;

    protected final NamespaceRegistry namespaceRegistry;

    protected final QueryTemplateCache queryTemplateCache;

    protected final Object syncLock = new Object();

    /**
     * Executor to sync service files asynchronously.
     */
    protected ExecutorService asyncExecutor = Executors.newSingleThreadExecutor();

    protected Map<String, ServiceEntry> registry = Maps.newHashMap();

    protected QueryTemplateCatalogAPIClient queryTemplateCatalogApiClient;

    protected static class ServiceEntry {
        public final QueryCatalogRESTService service;
        public final String sourceAppId;
        @Nullable
        public final String configRevision;
        @Nullable
        public final Instant creationDate;

        public ServiceEntry(QueryCatalogRESTService service, String sourceAppId, @Nullable String configRevision,
                @Nullable Instant creationDate) {
            this.service = service;
            this.sourceAppId = sourceAppId;
            this.configRevision = configRevision;
            this.creationDate = creationDate;
        }

        public boolean hasSameSourceAs(PlatformStorage.FindResult result) {
            ObjectRecord record = result.getRecord();
            return sourceAppId.equals(result.getAppId()) && Objects.equals(configRevision, record.getRevision())
                    && Objects.equals(creationDate, record.getMetadata().getCreationDate());
        }
    }

    /**
     * Creates an instance using the platform {@link RepositoryManager}.
     *
     * @throws Exception if the registry could not be initialized (e.g. error while
     *                   accessing the storage)
     */
    @Inject
    public QueryCatalogRESTServiceRegistry(RepositoryManager repositoryManager, PlatformStorage platformStorage,
            NamespaceRegistry namespaceRegistry, QueryTemplateCache queryTemplateCache, CacheManager cacheManager)
            throws Exception {
        this.repositoryManager = repositoryManager;
        this.platformStorage = platformStorage;
        this.namespaceRegistry = namespaceRegistry;
        this.queryTemplateCache = queryTemplateCache;

        syncServices();
        cacheManager.register(new ServiceObjectsCache());
    }

    private class ServiceObjectsCache implements PlatformCache {
        @Override
        public String getId() {
            return "QueryCatalogRESTServiceObjects";
        }

        @Override
        public void invalidate() {
            asyncExecutor.submit(() -> {
                try {
                    QueryCatalogRESTServiceRegistry.this.syncServices();
                } catch (IOException e) {
                    logger.error("Failed to sync QaaS service configs", e);
                }
            });
        }

        @Override
        public void invalidate(Set<IRI> iris) {
        }
    }

    public void syncServices() throws IOException {
        synchronized (syncLock) {
            List<PlatformStorage.FindResult> propFiles = platformStorage.findAll(SERVICE_CONFIG_OBJECT_PREFIX).values()
                    .stream().filter(result -> result.getRecord().getPath().hasExtension(".prop")).collect(toList());

            Set<String> foundServices = new HashSet<>();
            for (PlatformStorage.FindResult propFile : propFiles) {
                try {
                    ServiceEntry entry = createOrUpdateServiceFromPropertiesFile(propFile);
                    foundServices.add(entry.service.getId());
                } catch (ConfigurationException e) {
                    logger.error("Error while creation or updating a service instance from object \"{}\"",
                            propFile.getRecord().getPath());
                }
            }

            synchronized (this) {
                Set<String> toRemove = new HashSet<>(registry.keySet());
                toRemove.removeAll(foundServices);

                for (String serviceId : toRemove) {
                    registry.remove(serviceId);
                    logger.warn("Query catalog REST service deleted: \"{}\"", serviceId);
                }
            }
        }
    }

    /**
     * Creates or updates a {@link QueryCatalogRESTService} instance based on it's
     * config file.
     * 
     * @param propFile a {@link java.util.Properties} file containing the REST
     *                 service configuration.
     * @throws ConfigurationException if the config file is invalid.
     */
    private ServiceEntry createOrUpdateServiceFromPropertiesFile(PlatformStorage.FindResult propFile)
            throws ConfigurationException {
        ObjectRecord record = propFile.getRecord();
        String serviceId = StoragePath.removeAnyExtension(record.getPath().getLastComponent());

        synchronized (this) {
            ServiceEntry existingService = registry.get(serviceId);
            if (existingService != null && existingService.hasSameSourceAs(propFile)) {
                return existingService;
            }
        }

        PropertiesConfiguration configuration = ConfigurationUtil.createEmptyConfig();
        FileHandler handler = new FileHandler(configuration);
        try (InputStream content = record.getLocation().readContent()) {
            handler.load(content);
        } catch (IOException e) {
            throw new ConfigurationException(e);
        }

        synchronized (this) {
            ServiceEntry existingService = registry.get(serviceId);
            if (existingService == null) {
                QueryCatalogRESTService service = new QueryCatalogRESTService(serviceId, configuration,
                        queryTemplateCache, repositoryManager, namespaceRegistry.getPrefixMap());
                String sourceAppId = propFile.getAppId();
                String revision = record.getRevision();
                Instant creationDate = record.getMetadata().getCreationDate();
                ServiceEntry newlyRegistered = new ServiceEntry(service, sourceAppId, revision, creationDate);
                registry.put(serviceId, newlyRegistered);
                logger.warn("Query catalog REST service created: \"{}\"", serviceId);
                return newlyRegistered;
            } else if (!existingService.hasSameSourceAs(propFile)) {
                existingService.service.setConfiguration(configuration);
                logger.warn("Query catalog REST service modified: \"{}\"", serviceId);
            }
            return existingService;
        }
    }

    public synchronized List<String> listServiceIds() {
        return Lists.newArrayList(registry.keySet());
    }

    public synchronized List<QueryCatalogRESTService> getServices() {
        return registry.values().stream().map(entry -> entry.service).collect(toList());
    }

    public synchronized Optional<QueryCatalogRESTService> getService(String id) {
        ServiceEntry entry = this.registry.get(id);
        return entry == null ? Optional.empty() : Optional.of(entry.service);
    }

    /**
     * Returns a list of {@link QueryCatalogRESTService}s exposing the query
     * template with the IRI <code>templateIri</code>.
     * 
     * @param templateIri IRI of the query template
     * @return list of {@link QueryCatalogRESTService} instances
     */
    public List<QueryCatalogRESTService> getServicesByTemplateIri(IRI templateIri) {
        Preconditions.checkNotNull(templateIri);
        return getServices().stream().filter(service -> templateIri.equals(service.getIri())).collect(toList());
    }

    /**
     * Deletes the service by id together with the configuration file.
     * 
     * @param id          id of the service
     * @param targetAppId target app ID to delete service configuration from
     */
    public void deleteService(String id, String targetAppId) throws ConfigurationException {
        ObjectStorage storage = platformStorage.getStorage(targetAppId);
        StoragePath objectId = objectIdFromServiceId(id);

        ServiceEntry existing;
        synchronized (this) {
            existing = registry.get(id);
        }

        if (existing != null) {
            try {
                storage.deleteObject(objectId, platformStorage.getDefaultMetadata());

                Optional<PlatformStorage.FindResult> reloadedConfig = platformStorage.findObject(objectId);

                if (reloadedConfig.isPresent()) {
                    createOrUpdateServiceFromPropertiesFile(reloadedConfig.get());
                } else {
                    synchronized (this) {
                        registry.remove(id);
                    }
                }
            } catch (IOException e) {
                throw new ConfigurationException(e);
            }
        }
    }

    /**
     * Creates a new service with a given id (if it does not exist) or modifies an
     * existing one. Sets its properties according to {@code parameters}.
     * 
     * @param id          id of the service
     * @param parameters  map of service config parameters (see
     *                    {@link QueryCatalogRESTService})
     * @param targetAppId target app ID to save service configuration to
     * @throws ConfigurationException if the service could not be (re-)configured
     */
    public void addOrUpdateService(String id, Map<QaasField, String> parameters, String targetAppId)
            throws ConfigurationException {
        ObjectStorage storage = platformStorage.getStorage(targetAppId);
        StoragePath objectId = objectIdFromServiceId(id);

        ServiceEntry existing;
        synchronized (this) {
            existing = registry.get(id);
        }

        PropertiesConfiguration configuration = existing == null ? ConfigurationUtil.createEmptyConfig()
                : existing.service.cloneConfiguration();

        for (Entry<QaasField, String> entry : parameters.entrySet()) {
            setServiceField(configuration, entry.getKey(), entry.getValue());
        }

        IRI currentUserIri = namespaceRegistry.getUserIRI();
        setServiceField(configuration, QaasField.PUBLISHER, currentUserIri.stringValue());

        FileHandler handler = new FileHandler(configuration);
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            handler.save(os);
            storage.appendObject(objectId, platformStorage.getDefaultMetadata(), os.toInputStream(), os.size());
        } catch (IOException e) {
            throw new ConfigurationException(e);
        }

        Optional<PlatformStorage.FindResult> reloadedConfig;
        try {
            reloadedConfig = platformStorage.findObject(objectId);
        } catch (IOException e) {
            throw new ConfigurationException(e);
        }

        if (reloadedConfig.isPresent()) {
            createOrUpdateServiceFromPropertiesFile(reloadedConfig.get());
        }
    }

    private static void setServiceField(PropertiesConfiguration configuration, QaasField field,
            @Nullable String value) {
        if (field == QaasField.ACL && (value == null || !value.startsWith(Permissions.QAAS.PREFIX_EXECUTE))) {
            throw new IllegalStateException(
                    "ACL permission string must start with: \"" + Permissions.QAAS.PREFIX_EXECUTE + "\"");
        }

        if (value != null) {
            configuration.setProperty(field.configKey, value);
        } else {
            configuration.clearProperty(field.configKey);
        }
    }

    public static StoragePath objectIdFromServiceId(String serviceId) {
        return SERVICE_CONFIG_OBJECT_PREFIX.resolve(serviceId).addExtension(".prop");
    }
}
