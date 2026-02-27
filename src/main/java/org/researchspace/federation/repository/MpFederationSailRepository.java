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

import org.eclipse.rdf4j.federated.endpoint.EndpointClassification;
import org.eclipse.rdf4j.federated.endpoint.ResolvableEndpoint;
import org.eclipse.rdf4j.federated.endpoint.provider.ResolvableRepositoryInformation;
import org.eclipse.rdf4j.federated.repository.FedXRepository;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.RepositoryResolver;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sparql.federation.RepositoryFederatedService;
import org.eclipse.rdf4j.repository.sparql.federation.SPARQLServiceResolver;
import org.eclipse.rdf4j.sail.SailException;

import org.researchspace.repository.RepositoryManager;

/**
 * A custom extension of the generic {@link SailRepository} able to process
 * queries with custom aggregation functions (see
 * {@link MpFederationSailRepositoryConnection}).
 * 
 * Adapted to extend FedXRepository.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationSailRepository extends FedXRepository {

    private static final org.apache.logging.log4j.Logger logger = 
        org.apache.logging.log4j.LogManager.getLogger(MpFederationSailRepository.class);

    /**
     * Adapter that registers the FedX source selection cache with the platform CacheManager.
     * Stored so we can deregister on shutdown.
     */
    private SourceSelectionPlatformCache sourceSelectionPlatformCache;

    public MpFederationSailRepository(MpFederation sail) {
        super(sail, sail.getFedXConfig());
    }

    @Override
    protected void initializeInternal() throws RepositoryException {
        MpFederation sail = (MpFederation) getSail();
        
        // Configure custom service resolver
        RepositoryManager repositoryManager = sail.repositoryManagerProvider.get();
        SPARQLServiceResolver serviceResolver = new SPARQLServiceResolver();
        serviceResolver.setHttpClientSessionManager(repositoryManager.getClientSessionManager());
        
        sail.getRepositoryIDMappings().forEach((refIri, repoId) -> {
            try {
                Repository repo = repositoryManager.getRepository(repoId);
                if (repo != null) {
                    serviceResolver.registerService(refIri.stringValue(), 
                        new RepositoryFederatedService(repo, false));
                }
            } catch (RepositoryException e) {
                throw new SailException(e);
            }
        });
        
        // This sets the delegate in DelegateFederatedServiceResolver created by FedXRepository
        this.setFederatedServiceResolver(serviceResolver);
        
        // Set RepositoryResolver on the Sail to allow resolving the default member
        sail.setRepositoryResolver(new RepositoryResolver() {
            @Override
            public Repository getRepository(String repositoryID) throws SailException {
                try {
                    return repositoryManager.getRepository(repositoryID);
                } catch (Exception e) {
                    throw new SailException(e);
                }
            }
        });

        // Add default member to the Sail BEFORE super.initializeInternal()
        // This ensures EndpointManager picks it up
        try {
            String defaultRepositoryId = sail.getDefaultRepositoryId();
            if (repositoryManager.getRepository(defaultRepositoryId) == null) {
                 throw new SailException("Default repository not found: " + defaultRepositoryId);
            }
            
            ResolvableRepositoryInformation repoInfo = 
                new ResolvableRepositoryInformation(defaultRepositoryId);
            repoInfo.setWritable(true);
            ResolvableEndpoint defaultEndpoint = 
                new ResolvableEndpoint(repoInfo, defaultRepositoryId, EndpointClassification.Remote);
                        
            sail.addFederationMember(defaultEndpoint);
        } catch (Exception e) {
             throw new SailException(e);
        }
        
        // Add fedx:member repositories as federation members
        // These participate in FedX source selection and use our evaluation strategy
        for (String memberId : sail.getConfig().getFedxMemberRepositoryIds()) {
            try {
                if (repositoryManager.getRepository(memberId) == null) {
                    throw new SailException("FedX member repository not found: " + memberId);
                }
                ResolvableRepositoryInformation memberInfo = 
                    new ResolvableRepositoryInformation(memberId);
                ResolvableEndpoint memberEndpoint = 
                    new ResolvableEndpoint(memberInfo, memberId, EndpointClassification.Remote);
                sail.addFederationMember(memberEndpoint);
            } catch (Exception e) {
                throw new SailException("Failed to add FedX member '" + memberId + "': " + e.getMessage(), e);
            }
        }

        super.initializeInternal();

        // Register FedX source selection cache with platform CacheManager
        // so that CacheManager.invalidateAll() (triggered by SPARQL updates,
        // form persistence, LDP, etc.) also clears the source selection cache.
        try {
            var selectionCache = getFederationContext().getSourceSelectionCache();
            sourceSelectionPlatformCache = new SourceSelectionPlatformCache(
                    selectionCache, sail.getDefaultRepositoryId());
            sail.cacheManager.register(sourceSelectionPlatformCache);
            logger.debug("Registered FedX source selection cache with platform CacheManager");
        } catch (Exception e) {
            logger.warn("Failed to register source selection cache with CacheManager: {}", e.getMessage());
        }
    }

    @Override
    protected void shutDownInternal() throws RepositoryException {
        // Deregister source selection cache from CacheManager
        if (sourceSelectionPlatformCache != null) {
            try {
                MpFederation sail = (MpFederation) getSail();
                sail.cacheManager.deregister(sourceSelectionPlatformCache);
                logger.debug("Deregistered FedX source selection cache from platform CacheManager");
            } catch (Exception e) {
                logger.debug("Failed to deregister source selection cache: {}", e.getMessage());
            }
            sourceSelectionPlatformCache = null;
        }
        super.shutDownInternal();
    }
}