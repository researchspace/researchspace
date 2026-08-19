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
import org.eclipse.rdf4j.federated.algebra.SingleSourceQuery;
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
import org.eclipse.rdf4j.federated.evaluation.join.ControlledWorkerLeftJoin;
import org.eclipse.rdf4j.federated.evaluation.join.GuardedServiceBindLeftJoin;
import org.eclipse.rdf4j.federated.evaluation.join.JoinExecutorBase;
import org.eclipse.rdf4j.federated.optimizer.DefaultFedXCostModel;
import org.eclipse.rdf4j.federated.optimizer.GenericInfoOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.QueryRoot;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.EvaluationStatistics;
import org.eclipse.rdf4j.query.algebra.helpers.collectors.VarNameCollector;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.sparql.FederationSparqlAlgebraUtils;
import org.researchspace.sparql.renderer.MpSparqlQueryRenderer;
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
                return new SynchronousRestServiceJoin(b -> this.evaluate(rightArg, b), leftIter, bindings,
                        prefetchSize, executor);
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
     */
    private ExecutorService getRestServiceExecutor() {
        if (this.federationContext.getFederation() instanceof MpFederation) {
            return ((MpFederation) this.federationContext.getFederation()).getRestServiceExecutor();
        }
        // Unreachable: the only caller is guarded by isRestBackedService(),
        // which returns false for non-MpFederation federations. A silent
        // fallback executor here would leak one thread per REST join.
        throw new IllegalStateException(
                "REST-backed SERVICE evaluation requires an MpFederation (got "
                        + this.federationContext.getFederation().getClass().getName() + ")");
    }

    /**
     * Override to count left join calls for testing/debugging, to batch
     * {@code OPTIONAL { SERVICE <member> ... } } clauses, and to keep
     * non-guard conditional OPTIONALs out of the bind join path.
     * <p>
     * Upstream FedX excludes {@link FedXService} right arguments from the bind
     * left join path (one member request per left binding). For SERVICE
     * clauses that resolve to a non-REST federation member we batch instead:
     * {@link GuardedServiceBindLeftJoin} sends blocks of left rows to the
     * member in a single VALUES query.
     * </p>
     * <p>
     * A LeftJoin condition ({@code OPTIONAL { FILTER(...) SERVICE ... }})
     * whose variables are all producible by the LEFT side is handled per row
     * by {@link GuardedServiceBindLeftJoin}, preserving standard SPARQL
     * semantics: rows where the condition is decidable locally are batched or
     * passed through, rows with unbound condition variables fall back to
     * strict per-binding evaluation with a WARNING (see the class doc).
     * Any other condition is not passed to the bind path (it would silently be
     * dropped), so those joins fall back to {@code ControlledWorkerLeftJoin},
     * which evaluates the condition per binding (see
     * {@code ParallelLeftJoinTask}); a WARNING is logged since this means one
     * member request per input row.
     * </p>
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

        TupleExpr rightArg = leftJoin.getRightArg();
        boolean serviceBindLeftJoin = rightArg instanceof FedXService
                && queryInfo.getFederationContext().getConfig().isEnableOptionalAsBindJoin()
                // rdf4j forwards sub-SELECT service bodies verbatim (the projection-vars
                // parameter of Service.getSelectQueryString is ignored), so the VALUES
                // rewrite cannot inject its ?__index column - such bodies must be
                // evaluated per binding
                && !isSubSelectServiceBody((FedXService) rightArg)
                && resolveServiceMemberRepository((FedXService) rightArg) != null;

        if (leftJoin.hasCondition()) {
            if (serviceBindLeftJoin && isLeftEvaluableCondition(leftJoin)) {
                GuardedServiceBindLeftJoin join = new GuardedServiceBindLeftJoin(joinScheduler, this,
                        leftIter, leftJoin, bindings, queryInfo);
                executor.execute(join);
                return join;
            }

            if (serviceBindLeftJoin) {
                log.warn("OPTIONAL SERVICE condition {} references variables not producible by the left side; "
                        + "evaluating the member SERVICE once per input row (no batching). Restructure the query "
                        + "so the condition only uses variables computed before the OPTIONAL.",
                        leftJoin.getCondition());
            }

            ControlledWorkerLeftJoin join = new ControlledWorkerLeftJoin(joinScheduler, this,
                    leftIter, leftJoin, bindings, queryInfo);
            executor.execute(join);
            return join;
        }

        if (serviceBindLeftJoin) {
            GuardedServiceBindLeftJoin join = new GuardedServiceBindLeftJoin(joinScheduler, this,
                    leftIter, leftJoin, bindings, queryInfo);
            executor.execute(join);
            return join;
        }

        return super.executeLeftJoin(joinScheduler, leftIter, leftJoin, bindings, queryInfo);
    }

    /**
     * Whether the SERVICE body is itself a sub-SELECT. Mirrors the (private)
     * detection in rdf4j's {@code Service#initPreparedQueryString}: such bodies
     * are forwarded verbatim and cannot take part in the VALUES bind-join
     * rewrite.
     */
    private boolean isSubSelectServiceBody(FedXService service) {
        String body = service.getService().getServiceExpressionString();
        return body != null && SUBSELECT_BODY.matcher(body).matches();
    }

    private static final java.util.regex.Pattern SUBSELECT_BODY = java.util.regex.Pattern.compile("\\s*SELECT.*",
            java.util.regex.Pattern.CASE_INSENSITIVE | java.util.regex.Pattern.DOTALL);

    /**
     * Whether the LeftJoin condition references only variables that the left
     * side can produce, i.e. it can be evaluated per left row as a guard.
     */
    private boolean isLeftEvaluableCondition(LeftJoin leftJoin) {
        Set<String> conditionVars = VarNameCollector.process(leftJoin.getCondition());
        return leftJoin.getLeftArg().getBindingNames().containsAll(conditionVars);
    }

    /**
     * Resolve the repository behind a member SERVICE clause, or null if the
     * SERVICE does not target a non-REST ephedra member (REST services cannot
     * process VALUES clauses and keep their one-at-a-time evaluation).
     */
    private Repository resolveServiceMemberRepository(FedXService service) {
        Var serviceRef = service.getService().getServiceRef();
        if (serviceRef == null || !serviceRef.hasValue()) {
            return null;
        }
        if (!(this.federationContext.getFederation() instanceof MpFederation)) {
            return null;
        }
        MpFederation federation = (MpFederation) this.federationContext.getFederation();
        String serviceUri = serviceRef.getValue().stringValue();
        if (federation.isRestBackedService(serviceUri)) {
            return null;
        }
        return federation.getServiceMemberRepository(serviceUri);
    }

    /**
     * Warn (once per query) when input rows carry no binding for a variable
     * that the service body shares with other rows: those rows are emitted as
     * UNDEF in the VALUES clause and - per standard SPARQL semantics, which
     * batching preserves exactly - join with EVERY service solution, i.e. the
     * service patterns are unanchored for them. Queries should keep such
     * variables always bound (e.g. BIND(COALESCE(...)) with a sentinel value).
     */
    private void warnOnUndefJoinVariables(FedXService serviceExpr, List<BindingSet> bindings) {
        java.util.Set<String> serviceVars = serviceExpr.getService().getServiceVars();
        java.util.Set<String> relevant = new HashSet<>();
        for (BindingSet bs : bindings) {
            for (String name : bs.getBindingNames()) {
                if (serviceVars.contains(name)) {
                    relevant.add(name);
                }
            }
        }
        for (BindingSet bs : bindings) {
            for (String var : relevant) {
                if (!bs.hasBinding(var)) {
                    log.warn("Bound left join on SERVICE {}: input row {} has no binding for join variable ?{}; "
                            + "per SPARQL semantics it joins with EVERY service solution (unanchored remote "
                            + "pattern). Keep the variable always bound, e.g. BIND(COALESCE(...) AS ?{}) with a "
                            + "sentinel value.",
                            serviceExpr.getService().getServiceRef(), bs, var, var);
                    return;
                }
            }
        }
    }

    /**
     * Evaluate a SERVICE clause as a bound LEFT join: one VALUES query at the
     * member endpoint for the whole block of left rows; unmatched rows are
     * re-emitted NULL-extended by {@link BindLeftJoinIteration} based on the
     * echoed {@code ?__index} variable.
     */
    public CloseableIteration<BindingSet> evaluateServiceBoundLeftJoin(FedXService serviceExpr,
            List<BindingSet> bindings) throws QueryEvaluationException {

        Repository repo = resolveServiceMemberRepository(serviceExpr);
        if (repo == null) {
            throw new QueryEvaluationException("SERVICE "
                    + serviceExpr.getService().getServiceRef()
                    + " does not resolve to a federation member repository");
        }

        String preparedQuery = org.eclipse.rdf4j.federated.util.ExclusiveGroupQueryBuilder
                .buildServiceBoundLeftJoinVALUES(serviceExpr.getService(), bindings);

        warnOnUndefJoinVariables(serviceExpr, bindings);

        if (log.isDebugEnabled()) {
            log.debug("Service bound left join with {} bindings: {}", bindings.size(), preparedQuery);
        }

        RepositoryConnection conn = repo.getConnection();
        CloseableIteration<BindingSet> result = null;
        try {
            result = conn.prepareTupleQuery(preparedQuery).evaluate();
            return new BindLeftJoinIteration(result, bindings) {
                @Override
                protected void handleClose() {
                    try {
                        super.handleClose();
                    } finally {
                        conn.close();
                    }
                }
            };
        } catch (Throwable t) {
            if (result != null) {
                result.close();
            }
            conn.close();
            if (t instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new QueryEvaluationException(t);
        }
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

        // Note: no single-binding shortcut here — evaluating the group directly would
        // apply inner-join semantics and lose unmatched left rows. Left join semantics
        // require BindLeftJoinIteration to re-emit unmatched left bindings.

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

            // Apply filter and/or convert to left join semantics. The filter must run
            // BEFORE the left join conversion: a left row whose match fails the filter
            // has to be re-emitted as an unmatched (NULL-extended) row by
            // BindLeftJoinIteration, not dropped. Filtering after the conversion would
            // also drop NULL-extended rows (the filter vars are unbound there).
            if (filterExpr != null) {
                result = new FilteringIteration(filterExpr, result, this);
            }
            result = new BindLeftJoinIteration(result, bindings);

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

        // Optimization: single binding doesn't need VALUES batching. Only valid for
        // inner joins — for left joins unmatched left rows must be re-emitted by
        // BindLeftJoinIteration below.
        if (!leftJoin && bindings.size() == 1) {
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

    /**
     * Upstream {@code FederationEvalStrategy.optimize} contains two
     * {@link SingleSourceQuery} shortcuts that skip join optimization entirely
     * and forward the ORIGINAL query string verbatim to the single relevant
     * endpoint. Query hints are normally stripped during join optimization
     * ({@link #optimizeJoinOrder}), so on those shortcut paths the forwarded
     * string still contains the {@code ephedra:*} hint patterns — the endpoint
     * evaluates them as ordinary triple patterns that match nothing, and the
     * query silently returns zero results. Detect that case after the fact and
     * re-render the query without the hint patterns (hints only influence our
     * own join reordering, which the shortcut skips anyway, so dropping them
     * is semantically exact).
     */
    @Override
    public TupleExpr optimize(TupleExpr expr, EvaluationStatistics evaluationStatistics, BindingSet bindings) {
        TupleExpr optimized = super.optimize(expr, evaluationStatistics, bindings);
        if (optimized instanceof SingleSourceQuery && isQueryHintsEnabled()
                && !FederationSparqlAlgebraUtils.extractQueryHintsPatterns(expr).isEmpty()) {
            SingleSourceQuery singleSource = (SingleSourceQuery) optimized;
            TupleExpr stripped = expr.clone();
            if (!(stripped instanceof QueryRoot)) {
                stripped = new QueryRoot(stripped);
            }
            new QueryHintsExtractor().optimize(stripped, null, null);
            String hintFreeQuery;
            try {
                hintFreeQuery = new MpSparqlQueryRenderer().render(stripped);
            } catch (Exception e) {
                // Failing loudly beats the alternative: forwarding the hint
                // patterns yields silently wrong (empty) results.
                throw new QueryEvaluationException(
                        "Could not strip ephedra query hints from a single-source query; "
                                + "remove the hint patterns from the query or add a SERVICE clause",
                        e);
            }
            log.debug("Stripped ephedra query hints from single-source query for endpoint {}",
                    singleSource.getSource().getId());
            return new HintStrippedSingleSourceQuery(stripped, singleSource, hintFreeQuery);
        }
        return optimized;
    }

    /**
     * A {@link SingleSourceQuery} whose forwarded query string had the ephedra
     * hint patterns removed. Everything else behaves like the wrapped node.
     */
    private static class HintStrippedSingleSourceQuery extends SingleSourceQuery {
        private static final long serialVersionUID = 1L;

        private final String hintFreeQuery;

        HintStrippedSingleSourceQuery(TupleExpr strippedTree, SingleSourceQuery original, String hintFreeQuery) {
            super(strippedTree, original.getSource(), original.getQueryInfo());
            this.hintFreeQuery = hintFreeQuery;
        }

        @Override
        public String getQueryString() {
            return hintFreeQuery;
        }
    }

    private boolean isQueryHintsEnabled() {
        if (this.federationContext.getFederation() instanceof MpFederation) {
            return ((MpFederation) this.federationContext.getFederation()).isEnableQueryHints();
        }
        return true;
    }

    @Override
    protected void optimizeJoinOrder(TupleExpr query, QueryInfo queryInfo, GenericInfoOptimizer info) {
        boolean hintsEnabled = isQueryHintsEnabled();

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
