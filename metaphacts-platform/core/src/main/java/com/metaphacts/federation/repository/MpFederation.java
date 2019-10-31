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

package com.metaphacts.federation.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolver;
import org.eclipse.rdf4j.repository.sparql.federation.RepositoryFederatedService;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.filters.RepositoryBloomFilter;
import org.eclipse.rdf4j.repository.sparql.federation.SPARQLServiceResolver;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.MpFederationConnection;
import org.eclipse.rdf4j.sail.federation.Federation;

import com.google.common.collect.Maps;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.federation.repository.evaluation.MedianAggregateService;
import com.metaphacts.federation.repository.evaluation.MpFederationStrategy;
import com.metaphacts.repository.RepositoryManager;

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
    
    protected final int numThreads = 20;
    
    @Inject
    protected Provider<MpSparqlServiceRegistry> serviceRegistryProvider;
    
    protected Map<IRI, AggregateService> aggregateServiceRegistry = Maps.newHashMap();
    
    protected ExecutorService rankedExecutor = Executors.newCachedThreadPool(
            new ThreadFactoryBuilder().setNameFormat("mp-rdf4j-federation-%d").build());
    
    /* 
    TODO: re-enable for top-k "depth-first" optimization 
    protected ExecutorService rankedExecutor = new MpPriorityThreadPoolExecutor(numThreads, numThreads,
            0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingDeque<Runnable>(),
            new ThreadFactoryBuilder().setNameFormat("mp-federation-%d").build());
    */
    
    // Repository manager is injected via Guice
    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;
    
    protected boolean isServiceResolverInitialized = false;
    
    protected boolean useAsyncParallelJoin = true;
    protected boolean useCompetingJoin = true;
    protected boolean useBoundJoin = true; 
    protected boolean enableQueryHints = true;

    public MpFederation(String defaultRepositoryId, Map<IRI, String> repositoryIDMappings) {
        this.defaultRepositoryId = defaultRepositoryId;
        this.repositoryIDMappings = repositoryIDMappings;
        
        aggregateServiceRegistry.put(MedianAggregateService.SERVICE_ID, new MedianAggregateService());
    }

    @Override
    public synchronized MpFederationConnection getConnection() throws SailException {
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
            return new MpFederationConnection(this, connections);
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
        MpFederationStrategy strategy = new MpFederationStrategy(this, tripleSource, dataset, resolver);
        strategy.setUseAsyncParallelJoin(useAsyncParallelJoin);
        strategy.setUseBoundJoin(useBoundJoin);
        strategy.setUseCompetingJoin(useCompetingJoin);
        return strategy;
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
        SPARQLServiceResolver serviceResolver = new SPARQLServiceResolver();
        serviceResolver.setHttpClientSessionManager(repositoryManager.getClientSessionManager());
        serviceMappings.forEach((refIri, repo) -> {
            serviceResolver.registerService(refIri.stringValue(), 
                    new RepositoryFederatedService(repo, false));
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

    public ExecutorService getRankedExecutor() {
        return rankedExecutor;
    }
    
    @Override
    public void execute(Runnable command) {
        this.rankedExecutor.execute(command);
    }

    public MpSparqlServiceRegistry getServiceRegistry() throws Exception {
        if (this.serviceRegistryProvider != null) {
            return serviceRegistryProvider.get();
        } else {
            throw new IllegalStateException("Service registry provider is not available");
        }
    }
    
    public AggregateService getAggregateService(IRI uri) {
        return this.aggregateServiceRegistry.get(uri);
    }

    public boolean isUseAsyncParallelJoin() {
        return useAsyncParallelJoin;
    }

    public void setUseAsyncParallelJoin(boolean useAsyncParallelJoin) {
        this.useAsyncParallelJoin = useAsyncParallelJoin;
    }

    public boolean isUseCompetingJoin() {
        return useCompetingJoin;
    }

    public void setUseCompetingJoin(boolean useCompetingJoin) {
        this.useCompetingJoin = useCompetingJoin;
    }

    public boolean isUseBoundJoin() {
        return useBoundJoin;
    }

    public void setUseBoundJoin(boolean useBoundJoin) {
        this.useBoundJoin = useBoundJoin;
    }

    public boolean isEnableQueryHints() {
        return enableQueryHints;
    }

    public void setEnableQueryHints(boolean queryHintsEnabled) {
        this.enableQueryHints = queryHintsEnabled;
    }

    @Override
    public void shutDown() throws SailException {
        List<SailException> toThrowExceptions = new ArrayList<>();
        try {
            SPARQLServiceResolver toCloseServiceResolver = (SPARQLServiceResolver)getFederatedServiceResolver();
            super.setFederatedServiceResolver(null);
            if (toCloseServiceResolver != null) {
                toCloseServiceResolver.shutDown();
            }
        } finally {
            try {
                this.rankedExecutor.shutdown();
                this.rankedExecutor.awaitTermination(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                if (!this.rankedExecutor.isShutdown()) {
                    this.rankedExecutor.shutdownNow();
                }
            }
        }
        if (!toThrowExceptions.isEmpty()) {
            throw toThrowExceptions.get(0);
        }
    }
    
    
}