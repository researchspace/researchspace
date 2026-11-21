/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.eclipse.rdf4j.federated.evaluation.join;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.Phaser;
import java.util.concurrent.TimeUnit;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.federated.algebra.FedXService;
import org.eclipse.rdf4j.federated.evaluation.FederationEvalStrategy;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ControlledWorkerScheduler;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ParallelExecutor;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ParallelTask;
import org.eclipse.rdf4j.federated.evaluation.concurrent.ParallelTaskBase;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.helpers.collectors.VarNameCollector;
import org.eclipse.rdf4j.repository.sparql.federation.CollectionIteration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Bound LEFT join executor for {@code OPTIONAL { SERVICE <member> { ... } }}
 * clauses, optionally with a condition over left-side variables (the
 * {@code OPTIONAL { FILTER(...) SERVICE ... }} guard idiom). Fully
 * standard-compliant.
 * <p>
 * Upstream FedX excludes {@link FedXService} right arguments from the bind
 * left join path and evaluates them once per left binding. This executor
 * batches them instead: blocks of left rows are sent to the member endpoint in
 * a single VALUES query (see
 * {@code ExclusiveGroupQueryBuilder.buildServiceBoundLeftJoinVALUES}), with
 * unmatched rows re-emitted NULL-extended.
 * </p>
 * <p>
 * Rows within a block are grouped by the subset of service variables they
 * actually bind, one VALUES query per group. This keeps batching semantically
 * exact: a variable bound in SOME rows must stay in the remote projection for
 * the rows where it is UNDEF (per-binding evaluation returns the
 * service-produced value there), which a single mixed batch cannot express —
 * its VALUES clause removes the variable from the projection for every row.
 * </p>
 * <p>
 * A condition is handled per left row, soundly:
 * </p>
 * <ul>
 * <li>the condition is locally decidable - every condition variable is either
 * bound in the row (a compatible merge never re-binds a variable) or not
 * producible by the right side (the merge can never bind it): the condition
 * is evaluated against the row - {@code true} rows join the batch with the
 * condition discharged, {@code false}/error rows pass through unextended;</li>
 * <li>some condition variable is unbound in the row AND producible by the
 * right side: per SPARQL semantics the condition is undecidable locally. The
 * row falls back to strict per-binding evaluation
 * ({@link ParallelLeftJoinTask}) and a WARNING is logged - the service body is
 * then evaluated with the variable unbound, i.e. as an unanchored pattern
 * against the whole remote dataset. Fix the query so this state cannot occur,
 * e.g. {@code BIND(IRI(CONCAT(..., COALESCE(?x, "sentinel"))) AS ?joinVar)}
 * before the OPTIONAL.</li>
 * </ul>
 */
public class GuardedServiceBindLeftJoin extends ControlledWorkerBindJoinBase {

    private static final Logger log = LoggerFactory.getLogger(GuardedServiceBindLeftJoin.class);

    private final LeftJoin leftJoin;
    private final ValueExpr condition;
    private final Set<String> conditionVars;
    private final Set<String> rightSideVars;
    private final Set<String> serviceVars;

    private boolean warnedUnboundConditionVar = false;

    public GuardedServiceBindLeftJoin(ControlledWorkerScheduler<BindingSet> scheduler,
            FederationEvalStrategy strategy, CloseableIteration<BindingSet> leftIter,
            LeftJoin leftJoin, BindingSet bindings, QueryInfo queryInfo)
            throws QueryEvaluationException {
        super(scheduler, strategy, leftIter, leftJoin.getRightArg(), bindings, queryInfo);
        this.leftJoin = leftJoin;
        this.condition = leftJoin.getCondition();
        this.conditionVars = condition != null
                ? VarNameCollector.process(condition)
                : Collections.emptySet();
        this.rightSideVars = leftJoin.getRightArg().getBindingNames();
        this.serviceVars = ((FedXService) leftJoin.getRightArg()).getService().getServiceVars();
    }

    /** The subset of service variables a left row actually binds. */
    private Set<String> boundServiceVarSignature(BindingSet bs) {
        Set<String> signature = new TreeSet<>();
        for (String name : bs.getBindingNames()) {
            if (serviceVars.contains(name)) {
                signature.add(name);
            }
        }
        return signature;
    }

    @Override
    protected TaskCreator determineTaskCreator(org.eclipse.rdf4j.query.algebra.TupleExpr expr, BindingSet bs) {
        return new ServiceBoundLeftJoinTaskCreator(strategy, (FedXService) expr);
    }

    @Override
    protected void handleBindings() throws Exception {
        int nBindingsCfg = this.queryInfo.getFederationContext().getConfig().getBoundJoinBlockSize();
        int totalBindings = 0;
        TaskCreator taskCreator = null;
        Phaser currentPhaser = phaser;

        while (!isClosed() && leftIter.hasNext()) {

            // a phaser supports only up to 65535 registered parties
            if (currentPhaser.getRegisteredParties() >= 10000) {
                currentPhaser = new Phaser(currentPhaser);
            }

            int nBindings = getNextBindJoinSize(nBindingsCfg, totalBindings);

            // one batch per bound-service-variable signature (see class doc)
            Map<Set<String>, List<BindingSet>> batches = new LinkedHashMap<>();
            List<BindingSet> passThrough = null;

            int count = 0;
            while (!isClosed() && count < nBindings && leftIter.hasNext()) {
                BindingSet bs = leftIter.next();
                count++;

                if (condition != null) {
                    if (!isConditionLocallyDecidable(bs)) {
                        // The right side may still bind the missing variable;
                        // standard semantics require strict per-binding
                        // evaluation (the service body is then evaluated with
                        // the variable unbound - an unanchored remote pattern).
                        warnUnboundConditionVar(bs);
                        currentPhaser.register();
                        scheduler.schedule(new ParallelLeftJoinTask(
                                new PhaserHandlingParallelExecutor(this, currentPhaser), strategy, leftJoin, bs));
                        continue;
                    }
                    if (!conditionHolds(bs)) {
                        // definitively false: the merged solution cannot
                        // satisfy the condition either - emit unextended
                        if (passThrough == null) {
                            passThrough = new ArrayList<>();
                        }
                        passThrough.add(bs);
                        continue;
                    }
                    // definitively true: the condition is discharged, the row
                    // joins the unconditioned batch
                }

                if (taskCreator == null) {
                    taskCreator = determineTaskCreator(rightArg, bs);
                }
                batches.computeIfAbsent(boundServiceVarSignature(bs), k -> new ArrayList<>()).add(bs);
            }

            totalBindings += count;

            if (passThrough != null && !passThrough.isEmpty()) {
                addResult(new CollectionIteration<>(passThrough));
            }

            for (List<BindingSet> batch : batches.values()) {
                currentPhaser.register();
                scheduler.schedule(
                        taskCreator.getTask(new PhaserHandlingParallelExecutor(this, currentPhaser), batch));
            }
        }

        leftIter.close();

        scheduler.informFinish(this);

        if (log.isDebugEnabled()) {
            log.debug("JoinStats: left iter of " + getDisplayId() + " had " + totalBindings + " results.");
        }

        phaser.awaitAdvanceInterruptibly(phaser.arrive(), queryInfo.getMaxRemainingTimeMS(), TimeUnit.MILLISECONDS);
    }

    /**
     * The condition value over a merged solution is determined by the left row
     * alone when every condition variable is either bound in the row (a
     * compatible merge cannot re-bind it) or not producible by the right side
     * (the merge can never bind it).
     */
    private boolean isConditionLocallyDecidable(BindingSet bs) {
        for (String var : conditionVars) {
            if (!bs.hasBinding(var) && rightSideVars.contains(var)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Evaluate the condition against the left row alone. Only called when the
     * condition is locally decidable, so the result is definitive. Evaluation
     * errors count as false, mirroring FILTER semantics.
     */
    private boolean conditionHolds(BindingSet bs) {
        try {
            return strategy.isTrue(condition, bs);
        } catch (org.eclipse.rdf4j.query.algebra.evaluation.ValueExprEvaluationException e) {
            return false;
        } catch (QueryEvaluationException e) {
            return false;
        }
    }

    private void warnUnboundConditionVar(BindingSet bs) {
        if (!warnedUnboundConditionVar) {
            warnedUnboundConditionVar = true;
            log.warn("OPTIONAL SERVICE condition {} references variable(s) {} that are unbound in an input row {}. "
                    + "Falling back to strict per-binding evaluation for such rows: the SERVICE body is evaluated "
                    + "with the variable unbound (unanchored patterns against the remote dataset) and may "
                    + "cross-product per SPARQL semantics. Restructure the query so the variable is always bound, "
                    + "e.g. BIND(COALESCE(...) AS ?var) with a sentinel value before the OPTIONAL.",
                    condition, conditionVars, bs);
        }
    }

    protected static class ServiceBoundLeftJoinTaskCreator implements TaskCreator {
        private final FederationEvalStrategy strategy;
        private final FedXService service;

        protected ServiceBoundLeftJoinTaskCreator(FederationEvalStrategy strategy, FedXService service) {
            this.strategy = strategy;
            this.service = service;
        }

        @Override
        public ParallelTask<BindingSet> getTask(ParallelExecutor<BindingSet> control, List<BindingSet> bindings) {
            return new ParallelTaskBase<>() {
                @Override
                public ParallelExecutor<BindingSet> getControl() {
                    return control;
                }

                @Override
                protected CloseableIteration<BindingSet> performTaskInternal() throws Exception {
                    return ((org.researchspace.federation.repository.evaluation.QueryHintAwareSparqlFederationEvalStrategy) strategy)
                            .evaluateServiceBoundLeftJoin(service, bindings);
                }
            };
        }
    }
}
