/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.Set;
import java.util.concurrent.ExecutorService;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.federated.FederationContext;
import org.eclipse.rdf4j.federated.algebra.BoundJoinTupleExpr;
import org.eclipse.rdf4j.federated.algebra.FedXService;
import org.eclipse.rdf4j.federated.evaluation.SparqlFederationEvalStrategy;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ControlledWorkerScheduler;
import org.eclipse.rdf4j.federated.evaluation.join.ControlledWorkerBindJoin;
import org.eclipse.rdf4j.federated.evaluation.join.ControlledWorkerJoin;
import org.eclipse.rdf4j.federated.evaluation.join.JoinExecutorBase;
import org.eclipse.rdf4j.federated.optimizer.DefaultFedXCostModel;
import org.eclipse.rdf4j.federated.optimizer.GenericInfoOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.repository.optimizers.MpQueryHintsSyncOptimizer;
import org.researchspace.federation.repository.optimizers.QueryHintsExtractor;
import org.researchspace.federation.repository.optimizers.QueryHintsSetup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Custom evaluation strategy that supports query hints and disables bound join
 * for REST-backed services (which need lazy one-at-a-time evaluation).
 */
public class QueryHintAwareSparqlFederationEvalStrategy extends SparqlFederationEvalStrategy {
    
    private static final Logger log = LoggerFactory.getLogger(QueryHintAwareSparqlFederationEvalStrategy.class);
    
    public QueryHintAwareSparqlFederationEvalStrategy(FederationContext federationContext) {
        super(federationContext);
    }

    /**
     * Override executeJoin to use synchronous lazy evaluation for REST-backed services.
     * 
     * <p>REST services cannot handle VALUES clauses and need to be called one-at-a-time.
     * Using {@link SynchronousRestServiceJoin} enables true lazy evaluation which 
     * properly respects LIMIT - only making HTTP calls as results are consumed.</p>
     * 
     * <p>For SPARQL endpoints, we continue using parallel joins for better performance.</p>
     */
    @Override
    public CloseableIteration<BindingSet> executeJoin(
            ControlledWorkerScheduler<BindingSet> joinScheduler,
            CloseableIteration<BindingSet> leftIter,
            TupleExpr rightArg, Set<String> joinVars, BindingSet bindings, QueryInfo queryInfo)
            throws QueryEvaluationException {

        // Debug logging to understand join execution
        if (log.isTraceEnabled()) {
            log.trace("executeJoin called with rightArg type: {}", rightArg.getClass().getSimpleName());
        }

        // Check if this is a REST-backed SERVICE that needs synchronous lazy evaluation
        if (rightArg instanceof FedXService) {
            FedXService fedXService = (FedXService) rightArg;
            boolean isRest = isRestBackedService(fedXService);
            if (log.isTraceEnabled()) {
                Var serviceRef = fedXService.getService().getServiceRef();
                String serviceUri = serviceRef != null && serviceRef.hasValue() ? 
                    serviceRef.getValue().stringValue() : "unknown";
                log.trace("FedXService detected: uri={}, isRestBacked={}", serviceUri, isRest);
            }
            if (isRest) {
                // Use prefetching join for REST services - respects LIMIT with parallelism!
                int prefetchSize = getPrefetchSize();
                ExecutorService executor = getRestServiceExecutor();
                log.debug("Using SynchronousRestServiceJoin for REST service with prefetchSize={}", prefetchSize);
                return new SynchronousRestServiceJoin(this, leftIter, rightArg, bindings, prefetchSize, executor);
            }
        }
        
        // For non-REST services, use standard FedX join logic
        boolean executeAsBindJoin = false;
        if (rightArg instanceof BoundJoinTupleExpr) {
            if (rightArg instanceof FedXService) {
                // SPARQL endpoints: use vectored evaluation (faster)
                executeAsBindJoin = queryInfo.getFederationContext().getConfig().getEnableServiceAsBoundJoin();
            } else {
                executeAsBindJoin = true;
            }
        }

        JoinExecutorBase<BindingSet> join;
        if (executeAsBindJoin) {
            join = new ControlledWorkerBindJoin(joinScheduler, this, leftIter, rightArg,
                    bindings, queryInfo);
        } else {
            join = new ControlledWorkerJoin(joinScheduler, this, leftIter, rightArg, bindings,
                    queryInfo);
        }

        join.setJoinVars(joinVars);
        executor.execute(join);
        return join;
    }

    /**
     * Check if the FedXService targets a REST-backed repository.
     */
    private boolean isRestBackedService(FedXService service) {
        Var serviceRef = service.getService().getServiceRef();
        if (serviceRef != null && serviceRef.hasValue()) {
            String serviceUri = serviceRef.getValue().stringValue();
            if (this.federationContext.getFederation() instanceof MpFederation) {
                return ((MpFederation) this.federationContext.getFederation()).isRestBackedService(serviceUri);
            }
        }
        return false;
    }
    
    /**
     * Get the prefetch size for REST services from MpFederation config.
     * 
     * @return the prefetch size, or default value of 5 if not configured
     */
    private int getPrefetchSize() {
        if (this.federationContext.getFederation() instanceof MpFederation) {
            return ((MpFederation) this.federationContext.getFederation()).getRestServicePrefetchSize();
        }
        return 5; // Default
    }
    
    /**
     * Get the shared executor service for REST services from MpFederation.
     * Falls back to a default single-thread executor if not available.
     */
    private ExecutorService getRestServiceExecutor() {
        if (this.federationContext.getFederation() instanceof MpFederation) {
            return ((MpFederation) this.federationContext.getFederation()).getRestServiceExecutor();
        }
        // Fallback: shouldn't happen in normal use, but provides safety
        return java.util.concurrent.Executors.newSingleThreadExecutor();
    }

    @Override
    protected void optimizeJoinOrder(TupleExpr query, QueryInfo queryInfo, GenericInfoOptimizer info) {
        boolean hintsEnabled = true;
        if (this.federationContext.getFederation() instanceof MpFederation) {
            hintsEnabled = ((MpFederation) this.federationContext.getFederation()).isEnableQueryHints();
        }
        
        if (hintsEnabled) {
            // Extract query hints before join optimization
            QueryHintsExtractor hintsExtractor = new QueryHintsExtractor();
            hintsExtractor.optimize(query, null, null);
            QueryHintsSetup queryHintsSetup = hintsExtractor.getQueryHintsSetup();
            
            // Synchronize hints after previous optimizations may have restructured the query tree
            new MpQueryHintsSyncOptimizer(queryHintsSetup).optimize(query, null, null);
            
            // Use hint-aware join optimizer (handles both reordering and grouping)
            new QueryHintAwareJoinOptimizer(queryInfo, DefaultFedXCostModel.INSTANCE, queryHintsSetup).optimize(query);
        } else {
            super.optimizeJoinOrder(query, queryInfo, info);
        }
    }
}
