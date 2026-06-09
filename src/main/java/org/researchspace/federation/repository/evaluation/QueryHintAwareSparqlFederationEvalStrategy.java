/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.EmptyIteration;
import org.eclipse.rdf4j.federated.FederationContext;
import org.eclipse.rdf4j.federated.algebra.BoundJoinTupleExpr;
import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;
import org.eclipse.rdf4j.federated.algebra.ExclusiveTupleExpr;
import org.eclipse.rdf4j.federated.algebra.ExclusiveStatement;
import org.eclipse.rdf4j.federated.algebra.FedXService;
import org.eclipse.rdf4j.federated.algebra.StatementSource;
import org.eclipse.rdf4j.federated.algebra.StatementSource.StatementSourceType;
import org.eclipse.rdf4j.federated.algebra.FilterTuple;
import org.eclipse.rdf4j.federated.algebra.FilterValueExpr;
import org.eclipse.rdf4j.federated.algebra.StatementTupleExpr;
import org.eclipse.rdf4j.federated.cache.SourceSelectionCache;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.federated.evaluation.SparqlFederationEvalStrategy;
import org.eclipse.rdf4j.federated.evaluation.TripleSource;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ControlledWorkerScheduler;
import org.eclipse.rdf4j.federated.evaluation.iterator.BindLeftJoinIteration;
import org.eclipse.rdf4j.federated.evaluation.iterator.FilteringIteration;
import org.eclipse.rdf4j.federated.evaluation.join.ControlledWorkerBindJoin;
import org.eclipse.rdf4j.federated.evaluation.join.ControlledWorkerJoin;
import org.eclipse.rdf4j.federated.evaluation.join.JoinExecutorBase;
import org.eclipse.rdf4j.federated.optimizer.DefaultFedXCostModel;
import org.eclipse.rdf4j.federated.optimizer.GenericInfoOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.repository.optimizers.BoundJoinExclusiveGroupOptimizer;
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

    // Debug counters — gated behind a volatile flag so there is zero overhead at runtime.
    // Only enabled explicitly in tests via enableDebugCounters().
    private static volatile boolean debugCountersEnabled = false;
    private static final AtomicInteger leftJoinCallCount = new AtomicInteger(0);
    private static final AtomicInteger joinCallCount = new AtomicInteger(0);
    private static final AtomicInteger endpointEvalCount = new AtomicInteger(0);
    private static final AtomicInteger sourceSelectionBypassCount = new AtomicInteger(0);

    /** Enable debug counters (for tests only). */
    public static void enableDebugCounters() {
        debugCountersEnabled = true;
        leftJoinCallCount.set(0);
        joinCallCount.set(0);
        endpointEvalCount.set(0);
        sourceSelectionBypassCount.set(0);
    }

    /** Disable debug counters and reset to zero. */
    public static void disableDebugCounters() {
        debugCountersEnabled = false;
        leftJoinCallCount.set(0);
        joinCallCount.set(0);
        endpointEvalCount.set(0);
        sourceSelectionBypassCount.set(0);
    }

    /** Number of times executeLeftJoin was called (only tracked when debug counters are enabled). */
    public static int getLeftJoinCallCount() { return leftJoinCallCount.get(); }

    /** Number of times executeJoin was called (only tracked when debug counters are enabled). */
    public static int getJoinCallCount() { return joinCallCount.get(); }

    /**
     * Number of times a query was sent to any federation endpoint (evaluateExclusiveGroup
     * or evaluateExclusiveTupleExpr). This counts actual SPARQL queries dispatched to endpoints,
     * including the default repository. Directly measures the N-queries blow-up from
     * ControlledWorkerLeftJoin creating N ParallelLeftJoinTasks.
     */
    public static int getEndpointEvalCount() { return endpointEvalCount.get(); }

    /** Number of times source selection was bypassed due to single-member optimization. */
    public static int getSourceSelectionBypassCount() { return sourceSelectionBypassCount.get(); }
    
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

        if (debugCountersEnabled) {
            joinCallCount.incrementAndGet();
        }

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

    /**
     * Override to count left join calls for testing/debugging.
     */
    @Override
    protected CloseableIteration<BindingSet> executeLeftJoin(
            ControlledWorkerScheduler<BindingSet> joinScheduler,
            CloseableIteration<BindingSet> leftIter, LeftJoin leftJoin,
            BindingSet bindings, QueryInfo queryInfo)
            throws QueryEvaluationException {
        if (debugCountersEnabled) {
            leftJoinCallCount.incrementAndGet();
        }
        return super.executeLeftJoin(joinScheduler, leftIter, leftJoin, bindings, queryInfo);
    }

    /**
     * Override to count endpoint evaluations for grouped triple patterns.
     */
    @Override
    public CloseableIteration<BindingSet> evaluateExclusiveGroup(
            ExclusiveGroup group, BindingSet bindings)
            throws org.eclipse.rdf4j.repository.RepositoryException,
                   org.eclipse.rdf4j.query.MalformedQueryException,
                   QueryEvaluationException {
        if (debugCountersEnabled) {
            endpointEvalCount.incrementAndGet();
        }
        return super.evaluateExclusiveGroup(group, bindings);
    }

    /**
     * Override to handle {@link ExclusiveSubquery} directly and count endpoint
     * evaluations for single triple patterns.
     *
     * <p>
     * {@link ExclusiveSubquery} wraps an entire algebra tree (potentially
     * including UNIONs) destined for a single endpoint. It cannot go through
     * the normal precompile/ExclusiveTupleExprRenderer path because it's not
     * a simple statement pattern. Instead, we construct a SELECT query from
     * the algebra and send it directly to the endpoint.
     * </p>
     */
    @Override
    protected CloseableIteration<BindingSet> evaluateExclusiveTupleExpr(
            ExclusiveTupleExpr expr, BindingSet bindings)
            throws org.eclipse.rdf4j.repository.RepositoryException,
                   org.eclipse.rdf4j.query.MalformedQueryException,
                   QueryEvaluationException {
        if (debugCountersEnabled) {
            endpointEvalCount.incrementAndGet();
        }

        if (expr instanceof ExclusiveSubquery) {
            ExclusiveSubquery subquery = (ExclusiveSubquery) expr;
            String sparql = subquery.toSelectQuery(bindings);
            if (log.isDebugEnabled()) {
                log.debug("Evaluating ExclusiveSubquery @{}: {}",
                        subquery.getOwner().getEndpointID(), sparql);
            }
            TripleSource tripleSource = subquery.getOwnedEndpoint().getTripleSource();
            return tripleSource.getStatements(sparql, bindings, (FilterValueExpr) null, subquery.getQueryInfo());
        }

        return super.evaluateExclusiveTupleExpr(expr, bindings);
    }

    /**
     * Skip ASK-based source selection when the federation has a single member.
     * <p>
     * With only one endpoint, every triple pattern MUST go to that endpoint —
     * no ASK probes needed. This eliminates tens of thousands of redundant ASK
     * queries for queries like SERVICE + OPTIONAL where the OPTIONAL patterns
     * would otherwise be checked per-binding.
     * </p>
     * <p>
     * All patterns are annotated as {@link ExclusiveStatement} for the single
     * member, which enables downstream grouping into {@link ExclusiveGroup}
     * and VALUES-based batching.
     * </p>
     */
    @Override
    protected Set<Endpoint> performSourceSelection(List<Endpoint> members,
            SourceSelectionCache cache, QueryInfo queryInfo, GenericInfoOptimizer info) {

        if (members.size() == 1) {
            Endpoint singleMember = members.get(0);
            StatementSource source = new StatementSource(
                    singleMember.getId(), StatementSourceType.REMOTE);

            for (StatementPattern stmt : info.getStatements()) {
                stmt.replaceWith(new ExclusiveStatement(stmt, source, queryInfo));
            }

            if (debugCountersEnabled) {
                sourceSelectionBypassCount.incrementAndGet();
            }

            if (log.isDebugEnabled()) {
                log.debug("Single-member federation: skipping source selection, "
                        + "assigned {} patterns to {}",
                        info.getStatements().size(), singleMember.getId());
            }

            return new HashSet<>(Collections.singleton(singleMember));
        }

        return super.performSourceSelection(members, cache, queryInfo, info);
    }

    /**
     * Override to handle ExclusiveGroup in bind left joins.
     * <p>
     * The base FedX implementation casts to {@code (StatementPattern)} which crashes for
     * {@link ExclusiveGroup} (multi-pattern OPTIONALs). This override detects ExclusiveGroup
     * and builds a VALUES-based SPARQL query that batches all bindings into a single query,
     * reducing N individual queries to 1.
     * </p>
     * <p>
     * For example, with 10 left bindings and an OPTIONAL body of:
     * <pre>
     *   ?rec ex:hasObjectId ?objectid .
     *   ?rec ex:hasLabel ?label .
     * </pre>
     * Instead of sending 10 separate queries, we send ONE:
     * <pre>
     * SELECT ?rec ?objectid ?label ?__index WHERE {
     *   VALUES (?objectid ?__index) { ("1" "0") ("2" "1") ... ("10" "9") }
     *   ?rec ex:hasObjectId ?objectid .
     *   ?rec ex:hasLabel ?label .
     * }
     * </pre>
     * </p>
     */
    @Override
    public CloseableIteration<BindingSet> evaluateLeftBoundJoinStatementPattern(
            StatementTupleExpr stmt, List<BindingSet> bindings) throws QueryEvaluationException {
        
        if (stmt instanceof ExclusiveSubquery) {
            return evaluateExclusiveSubqueryBoundJoin((ExclusiveSubquery) stmt, bindings, true);
        }

        if (!(stmt instanceof ExclusiveGroup)) {
            // For regular StatementPattern, use the base implementation
            return super.evaluateLeftBoundJoinStatementPattern(stmt, bindings);
        }

        ExclusiveGroup group = (ExclusiveGroup) stmt;

        // Optimization: single binding doesn't need VALUES batching
        if (bindings.size() == 1) {
            return stmt.evaluate(bindings.get(0));
        }

        if (log.isDebugEnabled()) {
            log.debug("Evaluating ExclusiveGroup left bind join with {} bindings", bindings.size());
        }

        FilterValueExpr filterExpr = null;
        if (group instanceof FilterTuple) {
            filterExpr = ((FilterTuple) group).getFilterExpr();
        }

        // Build the VALUES-based SPARQL query for ExclusiveGroup using same-package helper
        String preparedQuery = org.eclipse.rdf4j.federated.util.ExclusiveGroupQueryBuilder
                .buildBoundJoinVALUES(group, bindings);

        CloseableIteration<BindingSet> result = null;
        try {
            result = evaluateAtStatementSources(preparedQuery, group.getStatementSources(),
                    group.getQueryInfo());

            // Apply filter and/or convert to left join semantics
            if (filterExpr != null) {
                result = new BindLeftJoinIteration(result, bindings);
                result = new FilteringIteration(filterExpr, result, this);
                if (!result.hasNext()) {
                    result.close();
                    return new EmptyIteration<>();
                }
            } else {
                result = new BindLeftJoinIteration(result, bindings);
            }

            return result;
        } catch (Throwable t) {
            if (result != null) {
                result.close();
            }
            if (t instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new QueryEvaluationException(t);
        }
    }

    /**
     * Override to handle ExclusiveGroup in regular bind joins (inner join).
     * <p>
     * Same VALUES-based batching as {@link #evaluateLeftBoundJoinStatementPattern},
     * but uses {@code BoundJoinVALUESConversionIteration} (inner join semantics —
     * only returns rows that match, no NULL-filling).
     * </p>
     */
    @Override
    public CloseableIteration<BindingSet> evaluateBoundJoinStatementPattern(
            StatementTupleExpr stmt, List<BindingSet> bindings) throws QueryEvaluationException {

        if (stmt instanceof ExclusiveSubquery) {
            return evaluateExclusiveSubqueryBoundJoin((ExclusiveSubquery) stmt, bindings, false);
        }

        if (!(stmt instanceof ExclusiveGroup)) {
            return super.evaluateBoundJoinStatementPattern(stmt, bindings);
        }

        ExclusiveGroup group = (ExclusiveGroup) stmt;

        if (bindings.size() == 1) {
            return stmt.evaluate(bindings.get(0));
        }

        if (log.isDebugEnabled()) {
            log.debug("Evaluating ExclusiveGroup bind join with {} bindings", bindings.size());
        }

        FilterValueExpr filterExpr = null;
        if (group instanceof FilterTuple) {
            filterExpr = ((FilterTuple) group).getFilterExpr();
        }

        String preparedQuery = org.eclipse.rdf4j.federated.util.ExclusiveGroupQueryBuilder
                .buildBoundJoinVALUES(group, bindings);

        CloseableIteration<BindingSet> result = null;
        try {
            result = evaluateAtStatementSources(preparedQuery, group.getStatementSources(),
                    group.getQueryInfo());

            // Apply filter and/or convert to original bindings (inner join semantics)
            if (filterExpr != null) {
                result = new org.eclipse.rdf4j.federated.evaluation.iterator
                        .BoundJoinVALUESConversionIteration(result, bindings);
                result = new FilteringIteration(filterExpr, result, this);
                if (!result.hasNext()) {
                    result.close();
                    return new EmptyIteration<>();
                }
            } else {
                result = new org.eclipse.rdf4j.federated.evaluation.iterator
                        .BoundJoinVALUESConversionIteration(result, bindings);
            }

            return result;
        } catch (Throwable t) {
            if (result != null) {
                result.close();
            }
            if (t instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new QueryEvaluationException(t);
        }
    }

    /**
     * Evaluate an {@link ExclusiveSubquery} with VALUES-based bind join.
     *
     * @param subquery  the exclusive subquery node
     * @param bindings  the batched bindings
     * @param leftJoin  true for left join semantics (NULL-fill), false for inner join
     * @return the result iteration
     */
    private CloseableIteration<BindingSet> evaluateExclusiveSubqueryBoundJoin(
            ExclusiveSubquery subquery, List<BindingSet> bindings, boolean leftJoin)
            throws QueryEvaluationException {

        // Optimization: single binding doesn't need VALUES batching
        if (bindings.size() == 1) {
            return subquery.evaluate(bindings.get(0));
        }

        if (log.isDebugEnabled()) {
            log.debug("Evaluating ExclusiveSubquery {} bind join @{} with {} bindings",
                    leftJoin ? "left" : "inner",
                    subquery.getOwner().getEndpointID(), bindings.size());
        }

        String preparedQuery = subquery.toSelectQueryBoundJoinVALUES(bindings);

        if (log.isDebugEnabled()) {
            log.debug("ExclusiveSubquery VALUES query: {}", preparedQuery);
        }

        CloseableIteration<BindingSet> result = null;
        try {
            result = evaluateAtStatementSources(preparedQuery,
                    subquery.getStatementSources(), subquery.getQueryInfo());

            if (leftJoin) {
                result = new BindLeftJoinIteration(result, bindings);
            } else {
                result = new org.eclipse.rdf4j.federated.evaluation.iterator
                        .BoundJoinVALUESConversionIteration(result, bindings);
            }

            return result;
        } catch (Throwable t) {
            if (result != null) {
                result.close();
            }
            if (t instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new QueryEvaluationException(t);
        }
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

        // Replace ExclusiveGroup nodes with BoundJoinExclusiveGroup so that
        // FedX's ControlledWorkerBindLeftJoin is used instead of ControlledWorkerLeftJoin,
        // preventing the N-query blow-up for OPTIONAL clauses
        new BoundJoinExclusiveGroupOptimizer().optimize(query, null, null);
    }
}
