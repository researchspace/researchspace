/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.federated.algebra.EmptyNJoin;
import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;
import org.eclipse.rdf4j.federated.algebra.ExclusiveTupleExpr;
import org.eclipse.rdf4j.federated.algebra.NJoin;
import org.eclipse.rdf4j.federated.algebra.NUnion;
import org.eclipse.rdf4j.federated.algebra.StatementSource;

import org.eclipse.rdf4j.federated.exception.OptimizationException;
import org.eclipse.rdf4j.federated.optimizer.FedXCostModel;
import org.eclipse.rdf4j.federated.optimizer.StatementGroupAndJoinOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.federated.util.QueryAlgebraUtil;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.researchspace.federation.repository.optimizers.QueryHintsSetup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Custom join optimizer that respects query hints and is aware of outer-scope
 * variables from enclosing LeftJoin (OPTIONAL) expressions.
 *
 * <p>
 * Standard FedX join ordering uses a cost model that only considers free
 * variables within each NJoin. When an NJoin is inside a LeftJoin right side
 * (OPTIONAL body), variables bound by the left side are invisible to the cost
 * model, causing incorrect join ordering. For example, if the left side
 * produces {@code ?citableReference} via BIND, the NJoin inside the OPTIONAL
 * should prefer patterns that use {@code ?citableReference} — but without
 * outer-scope awareness, those patterns appear unselective.
 * </p>
 *
 * <p>
 * This optimizer tracks outer-scope binding names when entering LeftJoin right
 * sides and seeds the join ordering with those variables, so the cost model
 * correctly identifies anchored patterns.
 * </p>
 */
public class QueryHintAwareJoinOptimizer extends StatementGroupAndJoinOptimizer {

    private static final Logger log = LoggerFactory.getLogger(QueryHintAwareJoinOptimizer.class);
    
    private final QueryHintsSetup hints;

    /**
     * Variables visible from an enclosing scope (e.g. the left side of a LeftJoin).
     * Non-empty only when visiting children of a LeftJoin's right side.
     */
    private Set<String> outerScopeVars = Collections.emptySet();
    
    public QueryHintAwareJoinOptimizer(QueryInfo queryInfo, FedXCostModel costModel, QueryHintsSetup hints) {
        super(queryInfo, costModel);
        this.hints = hints;
    }

    /**
     * Override to detect LeftJoin (OPTIONAL) nodes and track the left side's
     * binding names as outer-scope variables for the right side's join ordering.
     *
     * <p>
     * When visiting a LeftJoin:
     * <ol>
     *   <li>Visit the left child normally (no outer scope change)</li>
     *   <li>Save the left child's binding names as outer-scope vars</li>
     *   <li>Visit the right child with outer-scope awareness</li>
     *   <li>Restore the previous outer-scope vars</li>
     * </ol>
     * </p>
     *
     * <p>
     * <b>Important:</b> {@code FedXLeftJoin} extends {@code LeftJoin}, so the
     * Java visitor dispatches to {@code meet(LeftJoin)}, NOT {@code meetOther()}.
     * This override is therefore necessary (a check in {@code meetOther()} would
     * never fire for LeftJoin subclasses).
     * </p>
     */
    @Override
    public void meet(LeftJoin leftJoin) {
        // Visit the left child first (depth-first), with current outer scope
        leftJoin.getLeftArg().visit(this);

        // Before visiting the right child, set outer-scope vars to the left
        // side's binding names. This is the key insight: variables produced by
        // the left side are available when evaluating the right side.
        Set<String> previousOuterScope = this.outerScopeVars;
        Set<String> leftBindings = leftJoin.getLeftArg().getBindingNames();
        // Merge: if we're already inside a nested LeftJoin, keep both scopes
        if (previousOuterScope.isEmpty()) {
            this.outerScopeVars = leftBindings;
        } else {
            Set<String> merged = new HashSet<>(previousOuterScope);
            merged.addAll(leftBindings);
            this.outerScopeVars = merged;
        }

        if (log.isDebugEnabled()) {
            log.debug("Entering LeftJoin right side with outer-scope vars: {}",
                    leftBindings);
        }

        // Visit the right child with outer-scope awareness
        leftJoin.getRightArg().visit(this);

        // Visit the condition if present
        if (leftJoin.hasCondition()) {
            leftJoin.getCondition().visit(this);
        }

        // Restore previous scope
        this.outerScopeVars = previousOuterScope;
    }

    /**
     * Dispatch NJoin nodes to the parent's handler; everything else
     * uses the default visitor traversal.
     */
    @Override
    public void meetOther(QueryModelNode node) {
        // NJoin uses meetOther because it overrides visit() to call meetOther()
        super.meetOther(node);
    }

    /**
     * Override to detect when all NJoin children target the same single source.
     * In that case, replace the entire NJoin with an {@link ExclusiveSubquery}
     * that sends one SPARQL query to the endpoint instead of multiple
     * per-binding joins at the federation layer.
     */
    @Override
    protected void meetNJoin(NJoin node) {
        // Let the parent do formGroups + optimizeJoinOrder as usual
        List<TupleExpr> args = node.getArgs();
        args = formGroups(args);

        if (args.isEmpty()) {
            node.replaceWith(new EmptyNJoin(node, queryInfo));
            return;
        }

        if (args.size() == 1) {
            log.debug("Join arguments reduced to single argument, replacing join node.");
            node.replaceWith(args.get(0));
            return;
        }

        // Optimize join order (respects hints + outer-scope vars)
        args = optimizeJoinOrder(args);

        // ── Single-source detection ──
        // If ALL children resolve to the same source, replace the entire
        // NJoin with an ExclusiveSubquery — one SPARQL query instead of N.
        Optional<StatementSource> singleSource = detectSingleSource(args);
        if (singleSource.isPresent()) {
            NJoin optimizedNJoin = new NJoin(args, queryInfo);
            ExclusiveSubquery subquery = new ExclusiveSubquery(
                    optimizedNJoin, singleSource.get(), queryInfo);
            if (log.isDebugEnabled()) {
                log.debug("Single-source NJoin detected: replacing {} children with ExclusiveSubquery @{}",
                        args.size(), singleSource.get().getEndpointID());
            }
            node.replaceWith(subquery);
            return;
        }

        // Multiple sources — keep as NJoin
        NJoin newNode = new NJoin(args, queryInfo);
        node.replaceWith(newNode);
    }

    /**
     * Detect if all join arguments resolve to the same single source endpoint.
     *
     * @param args the NJoin children (after formGroups)
     * @return the single source if all children target it, or empty
     */
    private Optional<StatementSource> detectSingleSource(List<TupleExpr> args) {
        StatementSource commonSource = null;
        for (TupleExpr arg : args) {
            Optional<StatementSource> source = detectSource(arg);
            if (source.isEmpty()) {
                return Optional.empty(); // unknown source — can't merge
            }
            if (commonSource == null) {
                commonSource = source.get();
            } else if (!commonSource.equals(source.get())) {
                return Optional.empty(); // different sources
            }
        }
        return Optional.ofNullable(commonSource);
    }

    /**
     * Recursively detect the source endpoint of an algebra node.
     *
     * @param expr the algebra node
     * @return the source if exclusively owned by one endpoint, or empty
     */
    private Optional<StatementSource> detectSource(TupleExpr expr) {
        if (expr instanceof ExclusiveTupleExpr) {
            return Optional.of(((ExclusiveTupleExpr) expr).getOwner());
        }
        if (expr instanceof NUnion) {
            StatementSource source = null;
            for (TupleExpr child : ((NUnion) expr).getArgs()) {
                Optional<StatementSource> childSource = detectSource(child);
                if (childSource.isEmpty()) return Optional.empty();
                if (source == null) {
                    source = childSource.get();
                } else if (!source.equals(childSource.get())) {
                    return Optional.empty();
                }
            }
            return Optional.ofNullable(source);
        }
        if (expr instanceof NJoin) {
            StatementSource source = null;
            for (TupleExpr child : ((NJoin) expr).getArgs()) {
                Optional<StatementSource> childSource = detectSource(child);
                if (childSource.isEmpty()) return Optional.empty();
                if (source == null) {
                    source = childSource.get();
                } else if (!source.equals(childSource.get())) {
                    return Optional.empty();
                }
            }
            return Optional.ofNullable(source);
        }
        // Unknown node type — can't determine source
        return Optional.empty();
    }

    @Override
    protected List<TupleExpr> optimizeJoinOrder(List<TupleExpr> joinArgs) {
        
        if (hints.isDisableReordering()) {
            return joinArgs; // Preserve original order
        }
        
        // Apply forced ordering from hints
        List<TupleExpr> optimized = new ArrayList<>();
        List<TupleExpr> remaining = new LinkedList<>(joinArgs);

        // First: add all executeFirst items in order
        if (hints.getExecuteFirst() != null) {
            for (TupleExpr first : hints.getExecuteFirst()) {
                TupleExpr match = null;
                for (TupleExpr item : remaining) {
                    if (item == first || item.equals(first)) {
                        match = item;
                        break;
                    }
                    
                    // Check if the item is an ExclusiveGroup containing the hint target
                    if (item instanceof ExclusiveGroup) {
                         ExclusiveGroup group = (ExclusiveGroup) item;
                         for (org.eclipse.rdf4j.federated.algebra.ExclusiveTupleExpr expr : group.getExclusiveExpressions()) {
                             if (expr == first || expr.equals(first)) {
                                 match = item;
                                 break;
                             }
                         }
                         if (match != null) break;
                    }
                }

                if (match != null) {
                    optimized.add(match);
                    remaining.remove(match);
                }
            }
        }
        
        // Middle: apply cost-based optimization to remaining items (excluding executeLast)
        List<TupleExpr> middleItems = remaining.stream()
            .filter(e -> hints.getExecuteLast() == null || !hints.getExecuteLast().contains(e))
            .collect(Collectors.toList());
            
        if (!middleItems.isEmpty()) {
            if (outerScopeVars.isEmpty()) {
                // No outer scope — use default cost-based ordering
                optimized.addAll(super.optimizeJoinOrder(middleItems));
            } else {
                // Outer scope available (we're inside a LeftJoin right side):
                // seed joinVars with outer-scope vars so the cost model knows
                // which patterns are already anchored by bound variables.
                optimized.addAll(optimizeJoinOrderWithOuterScope(middleItems));
            }
        }
        
        // Remove middle items from remaining
        remaining.removeAll(middleItems);
        
        // Last: add all executeLast items at the end
        if (hints.getExecuteLast() != null) {
            for (TupleExpr last : hints.getExecuteLast()) {
                if (remaining.contains(last)) {
                    optimized.add(last);
                    remaining.remove(last);
                }
            }
        }
        
        // Add anything else that might have been missed (safety net)
        optimized.addAll(remaining);
        
        return optimized;
    }

    /**
     * Cost-based join ordering with outer-scope variables seeded as initial
     * join variables. This makes the cost model treat outer-scope-bound
     * variables as "already bound", correctly preferring patterns that
     * reference them.
     *
     * <p>
     * This is the same greedy algorithm as
     * {@link StatementGroupAndJoinOptimizer#optimizeJoinOrder}, but with
     * {@code joinVars} initialized to the outer scope instead of empty.
     * </p>
     */
    private List<TupleExpr> optimizeJoinOrderWithOuterScope(List<TupleExpr> joinArgs) {
        List<TupleExpr> optimized = new ArrayList<>(joinArgs.size());
        List<TupleExpr> left = new LinkedList<>(joinArgs);
        // Seed with outer-scope vars — the key difference from the default algorithm
        Set<String> joinVars = new HashSet<>(outerScopeVars);

        if (log.isDebugEnabled()) {
            log.debug("Optimizing join order with {} outer-scope vars as seed: {}",
                    outerScopeVars.size(), outerScopeVars);
            for (TupleExpr arg : joinArgs) {
                Collection<String> freeVars = QueryAlgebraUtil.getFreeVars(arg);
                long overlap = freeVars.stream().filter(outerScopeVars::contains).count();
                log.debug("Arg: {} freeVars={} overlap={} baseCost={}",
                        arg.getClass().getSimpleName(), freeVars, overlap,
                        estimateCost(arg, joinVars));
            }
        }

        while (!left.isEmpty()) {
            TupleExpr item = left.get(0);
            double minCost = Double.MAX_VALUE;

            for (TupleExpr tmp : left) {
                double baseCost = estimateCost(tmp, joinVars);

                // Apply a bonus for nodes whose free variables overlap with
                // outer-scope vars. The default cost model doesn't sufficiently
                // reward this overlap, so a full-scan ExclusiveGroup with 0
                // overlap can beat an NUnion with 1 overlap by just 1 point.
                // Apply -50 per overlapping var to strongly prefer patterns
                // that use already-bound outer-scope variables.
                Collection<String> freeVars = QueryAlgebraUtil.getFreeVars(tmp);
                long outerOverlap = freeVars.stream()
                        .filter(outerScopeVars::contains)
                        .count();
                double adjustedCost = baseCost - (outerOverlap * 50.0);

                if (log.isDebugEnabled()) {
                    log.debug("Evaluating: {} baseCost={} overlap={} adjustedCost={}",
                            tmp.getClass().getSimpleName(), baseCost, outerOverlap, adjustedCost);
                }

                if (adjustedCost < minCost) {
                    item = tmp;
                    minCost = adjustedCost;
                }
            }

            joinVars.addAll(QueryAlgebraUtil.getFreeVars(item));
            if (log.isDebugEnabled()) {
                log.debug("Selected: {} with cost {} (joinVars now: {})",
                        item.getClass().getSimpleName(), minCost, joinVars);
            }
            optimized.add(item);
            left.remove(item);
        }

        return optimized;
    }
}
