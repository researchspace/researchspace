/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.repository.federation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolver;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolverImpl;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.RepositoryFederatedService;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.filters.RepositoryBloomFilter;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.Federation;
import org.eclipse.rdf4j.sail.federation.MpReadOnlyFederationConnection;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.federation.evaluation.MpFederationStrategy;

/**
 * Implementation of the custom federation SAIL.
 * Repositories registered in {@link RepositoryManager} can be referenced as federation members.
 * Configuration properties are defined by {@link MpFederationConfig}, 
 * instances are created by {@link MpFederationFactory}. 
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpFederation extends Federation {
    
    private static final Logger logger = LogManager.getLogger(MpFederation.class);
    
    protected Map<IRI, String> repositoryIDMappings;
    
    protected final String defaultRepositoryId; 
    
    // Repository manager is injected via Guice
    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;
    
    protected boolean isServiceResolverInitialized = false;

    public MpFederation(String defaultRepositoryId, Map<IRI, String> repositoryIDMappings) {
        this.defaultRepositoryId = defaultRepositoryId;
        this.repositoryIDMappings = repositoryIDMappings;
    }

    @Override
    public synchronized SailConnection getConnection() throws SailException {
        if (!isServiceResolverInitialized) {
            this.initServiceResolver();
        }
        List<Repository> members = getMembers();
        List<RepositoryConnection> connections = 
                new ArrayList<RepositoryConnection>(members.size());
        try {
            for (Repository member : members) {
                connections.add(member.getConnection());
            }
            return new MpReadOnlyFederationConnection(this, connections);
        } catch (RepositoryException e) {
            closeAll(connections);
            throw new SailException(e);
        } catch (RuntimeException e) {
            closeAll(connections);
            throw e;
        }
    }
    
    private void closeAll(Iterable<RepositoryConnection> connections) {
        for (RepositoryConnection con : connections) {
            try {
                con.close();
            }
            catch (RepositoryException e) {
                logger.error(e.getMessage(), e);
            }
        }
    }

    @Override
    public Map<Repository, RepositoryBloomFilter> getBloomFilters() {
        return super.getBloomFilters();
    }

    @Override
    protected MpFederationStrategy createEvaluationStrategy(TripleSource tripleSource,
            Dataset dataset, FederatedServiceResolver resolver) {
        return new MpFederationStrategy(this, tripleSource, dataset, resolver);
    }
    
    public MpFederationStrategy createEvaluationStrategy(TripleSource tripleSource, 
            Dataset dataset) {
        return createEvaluationStrategy(tripleSource, dataset, getFederatedServiceResolver());
    }

    @Override
    public List<Repository> getMembers() {
        return super.getMembers();
    }
    
    /**
     * Gets the mappings (service IRI->Repository) for 
     * repositories accessible as federation members. 
     * 
     * @return
     */
    public Map<IRI, Repository> getServiceMappings() {
        RepositoryManager repositoryManager = repositoryManagerProvider.get();
        return repositoryIDMappings.entrySet().stream().collect(
                Collectors.toMap(
                    entry -> entry.getKey(), 
                    entry -> repositoryManager.getRepository(entry.getValue())));
    }
    
    /**
     * Federation service resolver is initialized from {@link RepositoryManager}
     */
    protected synchronized void initServiceResolver() {
        RepositoryManager repositoryManager = repositoryManagerProvider.get();
        super.addMember(repositoryManager.getRepository(this.defaultRepositoryId));
        
        Map<IRI, Repository> serviceMappings = getServiceMappings();
        FederatedServiceResolverImpl serviceResolver = new FederatedServiceResolverImpl();
        serviceResolver.setHttpClientSessionManager(repositoryManager.getClientSessionManager());
        serviceMappings.forEach((refIri, repo) -> {
            serviceResolver.registerService(refIri.stringValue(), 
                    new RepositoryFederatedService(repo));
        });
        
        super.setFederatedServiceResolver(serviceResolver);
        isServiceResolverInitialized = true;
    }

    @Override
    public void addMember(Repository member) {
        throw new UnsupportedOperationException(
                "The federation assumes only one default federation member. "
                + "Others must be referenced as services.");
    }

    @Override
    public synchronized void setFederatedServiceResolver(FederatedServiceResolver resolver) {
        throw new UnsupportedOperationException(
                "Resolvable federated services are passed via the RepositoryManager.");
    }

    @Override
    public void initialize() throws SailException {
        // No-op: initialization of members processed separately by the RepositoryManager.
    }
    
    

}