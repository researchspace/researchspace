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

package org.researchspace.federation.repository;

import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.federated.FedX;
import org.eclipse.rdf4j.federated.FedXConfig;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;
import org.researchspace.federation.repository.evaluation.QueryHintAwareFederationEvaluationStrategyFactory;

import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * Implementation of the custom federation SAIL. Repositories registered in
 * {@link RepositoryManager} can be referenced as federation members.
 * Configuration properties are defined by {@link MpFederationConfig}, instances
 * are created by {@link MpFederationFactory}.
 * 
 * Adapted to extend FedX for RDF4J 5.x compatibility.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpFederation extends FedX {

    private static final Logger logger = LogManager.getLogger(MpFederation.class);

    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;

    /**
     * The configuration for this federation.
     * All settings are retrieved from here rather than stored as separate fields.
     */
    private final MpFederationConfig config;
    
    /**
     * Shared executor service for REST service prefetching.
     * Size is 3x prefetchSize to handle multiple concurrent queries.
     * Created lazily on first access.
     */
    private volatile ExecutorService restServiceExecutor;

    /**
     * Create a new MpFederation with the given configuration.
     * 
     * @param config the federation configuration containing all settings
     */
    public MpFederation(MpFederationConfig config) {
        super(new ArrayList<>());
        this.config = config;
        
        // Apply FedX configuration - apply legacy config options for backwards compatibility
        FedXConfig fedXConfig = config.getFedXConfig();
        fedXConfig.withEnableServiceAsBoundJoin(config.isUseBoundJoin());
        
        this.setFederationEvaluationStrategy(new QueryHintAwareFederationEvaluationStrategyFactory());
        
        logger.debug("MpFederation initialized with restServicePrefetchSize={}", 
                config.getRestServicePrefetchSize());
    }
    
    /**
     * Get the configuration for this federation.
     * 
     * @return the MpFederationConfig
     */
    public MpFederationConfig getConfig() {
        return config;
    }
    
    /**
     * Get the default member repository ID.
     */
    public String getDefaultRepositoryId() {
        return config.getDefaultMember();
    }
    
    /**
     * Get the repository ID mappings (SERVICE URI -> repository ID).
     */
    public Map<IRI, String> getRepositoryIDMappings() {
        return config.getRepositoryIDMappings();
    }
    
    @Override
    protected void shutDownInternal() throws SailException {
        logger.debug("Shutting down MpFederation, stopping REST service executor");
        if (restServiceExecutor != null) {
            restServiceExecutor.shutdown();
            try {
                if (!restServiceExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    restServiceExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                restServiceExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        super.shutDownInternal();
    }
    
    /**
     * Get the FedX configuration for this federation.
     * 
     * @return the FedXConfig
     */
    public FedXConfig getFedXConfig() {
        return config.getFedXConfig();
    }
    
    /**
     * Get the prefetch size for REST services.
     * This controls how many HTTP calls are made in parallel when evaluating REST services.
     * 
     * @return the prefetch size (default 5)
     */
    public int getRestServicePrefetchSize() {
        return config.getRestServicePrefetchSize();
    }
    
    /**
     * Get the shared executor service for REST service prefetching.
     * This executor is shared across all queries to avoid creating new thread pools per query.
     * Created lazily on first access.
     * 
     * @return the shared executor service
     */
    public ExecutorService getRestServiceExecutor() {
        // Double-checked locking for lazy initialization
        if (restServiceExecutor == null) {
            synchronized (this) {
                if (restServiceExecutor == null) {
                    int prefetchSize = config.getRestServicePrefetchSize();
                    int poolSize = prefetchSize * 3;
                    restServiceExecutor = Executors.newFixedThreadPool(poolSize);
                    logger.debug("Created REST service executor with pool size {}", poolSize);
                }
            }
        }
        return restServiceExecutor;
    }

    public boolean isEnableQueryHints() {
        return config.isEnableQueryHints();
    }

    public void addFederationMember(Endpoint endpoint) {
        this.addMember(endpoint);
    }

    /**
     * Checks if the given service URI maps to a REST-backed repository.
     * REST services should not use vectored (bound join) evaluation because
     * REST APIs cannot process VALUES clauses - they need to be called one-at-a-time.
     * 
     * @param serviceUri the SERVICE clause URI
     * @return true if the service maps to a repository backed by AbstractServiceWrappingSail
     */
    public boolean isRestBackedService(String serviceUri) {
        try {
            IRI serviceIri = SimpleValueFactory.getInstance().createIRI(serviceUri);
            Map<IRI, String> mappings = config.getRepositoryIDMappings();
            String repoId = mappings.get(serviceIri);
            
            if (logger.isTraceEnabled()) {
                logger.trace("isRestBackedService: uri={}, mappedRepoId={}, mappingsSize={}", 
                    serviceUri, repoId, mappings.size());
            }
            
            if (repoId != null && repositoryManagerProvider != null) {
                Repository repo = repositoryManagerProvider.get().getRepository(repoId);
                
                if (repo instanceof SailRepository) {
                    var sail = ((SailRepository) repo).getSail();
                    boolean isRest = sail instanceof AbstractServiceWrappingSail;
                    if (logger.isTraceEnabled()) {
                        logger.trace("isRestBackedService: repoId={}, sailType={}, isRest={}", 
                            repoId, sail.getClass().getSimpleName(), isRest);
                    }
                    return isRest;
                }
            }
        } catch (Exception e) {
            logger.debug("Error checking if service is REST-backed: {}", serviceUri, e);
        }
        return false;
    }
}