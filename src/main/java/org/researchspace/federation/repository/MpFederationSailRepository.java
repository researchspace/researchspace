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

import org.eclipse.rdf4j.federated.FedXConfig;
import org.eclipse.rdf4j.federated.repository.FedXRepository;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.sail.SailException;

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

    public MpFederationSailRepository(MpFederation sail) {
        super(sail, new FedXConfig());
    }

    @Override
    protected void initializeInternal() throws RepositoryException {
        MpFederation sail = (MpFederation) getSail();
        
        // Configure custom service resolver
        // We access protected fields from MpFederation since we are in the same package
        org.researchspace.repository.RepositoryManager repositoryManager = sail.repositoryManagerProvider.get();
        org.eclipse.rdf4j.repository.sparql.federation.SPARQLServiceResolver serviceResolver = new org.eclipse.rdf4j.repository.sparql.federation.SPARQLServiceResolver();
        serviceResolver.setHttpClientSessionManager(repositoryManager.getClientSessionManager());
        
        sail.repositoryIDMappings.forEach((refIri, repoId) -> {
            try {
                org.eclipse.rdf4j.repository.Repository repo = repositoryManager.getRepository(repoId);
                if (repo != null) {
                    serviceResolver.registerService(refIri.stringValue(), 
                        new org.eclipse.rdf4j.repository.sparql.federation.RepositoryFederatedService(repo, false));
                }
            } catch (RepositoryException e) {
                throw new SailException(e);
            }
        });
        
        // This sets the delegate in DelegateFederatedServiceResolver created by FedXRepository
        this.setFederatedServiceResolver(serviceResolver);
        
        // Set RepositoryResolver on the Sail to allow resolving the default member
        sail.setRepositoryResolver(new org.eclipse.rdf4j.repository.RepositoryResolver() {
            @Override
            public org.eclipse.rdf4j.repository.Repository getRepository(String repositoryID) throws org.eclipse.rdf4j.sail.SailException {
                try {
                    return repositoryManager.getRepository(repositoryID);
                } catch (Exception e) {
                    throw new org.eclipse.rdf4j.sail.SailException(e);
                }
            }
        });

        // Add default member to the Sail BEFORE super.initializeInternal()
        // This ensures EndpointManager picks it up
        try {
            if (repositoryManager.getRepository(sail.defaultRepositoryId) == null) {
                 throw new SailException("Default repository not found: " + sail.defaultRepositoryId);
            }
            
            org.eclipse.rdf4j.federated.endpoint.provider.ResolvableRepositoryInformation repoInfo = 
                new org.eclipse.rdf4j.federated.endpoint.provider.ResolvableRepositoryInformation(sail.defaultRepositoryId);
            org.eclipse.rdf4j.federated.endpoint.ResolvableEndpoint defaultEndpoint = 
                new org.eclipse.rdf4j.federated.endpoint.ResolvableEndpoint(repoInfo, sail.defaultRepositoryId, org.eclipse.rdf4j.federated.endpoint.EndpointClassification.Remote);
            
            // We cannot set the resolver on the endpoint here easily as we don't have the getter, 
            // but FedX.initializeMember will do it if we set it on the Sail (which we did above).
            
            sail.addFederationMember(defaultEndpoint);
            
        } catch (Exception e) {
             throw new SailException(e);
        }

        super.initializeInternal();
    }
}