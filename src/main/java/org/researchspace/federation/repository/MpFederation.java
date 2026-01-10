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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.federated.FedX;
import org.eclipse.rdf4j.federated.FedXConfig;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.federated.endpoint.ResolvableEndpoint;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolver;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryResolver;
import org.eclipse.rdf4j.repository.sparql.federation.RepositoryFederatedService;
import org.eclipse.rdf4j.repository.sparql.federation.SPARQLServiceResolver;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.researchspace.repository.RepositoryManager;

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

    protected Map<IRI, String> repositoryIDMappings;

    protected final String defaultRepositoryId;

    // Repository manager is injected via Guice
    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;

    private boolean enableQueryHints = true;

    public MpFederation(String defaultRepositoryId, Map<IRI, String> repositoryIDMappings, FedXConfig config) {
        super(new ArrayList<>()); // FedX constructor takes List<Endpoint>
        this.defaultRepositoryId = defaultRepositoryId;
        this.repositoryIDMappings = repositoryIDMappings;
        this.setFederationEvaluationStrategy(new org.researchspace.federation.repository.evaluation.QueryHintAwareFederationEvaluationStrategyFactory());
        // Note: FedXConfig is handled by FedXRepository or can be set via FederationContext
    }

    public boolean isEnableQueryHints() {
        return enableQueryHints;
    }

    public void setEnableQueryHints(boolean enableQueryHints) {
        this.enableQueryHints = enableQueryHints;
    }

    public AggregateService getAggregateService(IRI iri) {
        // TODO: Implement registry or lookup if needed. For now return null or empty.
        return null;
    }

    @Override
    protected void initializeInternal() throws SailException {
        // Add members from configuration
        if (repositoryIDMappings != null) {
            RepositoryManager repositoryManager = repositoryManagerProvider.get();
            RepositoryResolver repositoryResolver = new RepositoryResolver() {
                @Override
                public Repository getRepository(String id) throws RepositoryException, RepositoryConfigException {
                    return repositoryManager.getRepository(id);
                }
            };
            
            // We do NOT add repositoryIDMappings as members of the federation. 
            // They are only used for SERVICE resolution (registered in MpFederationSailRepository).
            // Only the default repository should be a member of the federation for BGP evaluation.
            
            // Add the default member if it's not already added
             if (defaultRepositoryId != null) {
                 boolean alreadyExists = getMembers().stream()
                     .anyMatch(e -> e.getId().equals(defaultRepositoryId));
                 
                 if (!alreadyExists) {
                     ResolvableEndpoint endpoint = (ResolvableEndpoint) org.eclipse.rdf4j.federated.endpoint.EndpointFactory.loadResolvableRepository(defaultRepositoryId);
                     endpoint.setRepositoryResolver(repositoryResolver);
                     this.addMember(endpoint);
                 }
             }
        }
        
        super.initializeInternal();
    }
    
    // Helper to expose the service registry if needed, though FedX handles this internally via FederatedServiceResolver
    public FederatedServiceResolver getServiceResolver() {
        return null; // Not directly exposed in FedX API, but configured via setFederatedServiceResolver
    }

    public void addFederationMember(Endpoint endpoint) {
        this.addMember(endpoint);
    }
}