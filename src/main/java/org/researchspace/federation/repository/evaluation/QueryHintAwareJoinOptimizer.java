/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;

import org.eclipse.rdf4j.federated.optimizer.FedXCostModel;
import org.eclipse.rdf4j.federated.optimizer.StatementGroupAndJoinOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.researchspace.federation.repository.optimizers.QueryHintsSetup;

/**
 * Custom join optimizer that respects query hints.
 */
public class QueryHintAwareJoinOptimizer extends StatementGroupAndJoinOptimizer {
    
    private final QueryHintsSetup hints;
    
    public QueryHintAwareJoinOptimizer(QueryInfo queryInfo, FedXCostModel costModel, QueryHintsSetup hints) {
        super(queryInfo, costModel);
        this.hints = hints;
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
        
        // Middle: apply default cost-based optimization to remaining items
        // But we must exclude executeLast items from this optimization
        List<TupleExpr> middleItems = remaining.stream()
            .filter(e -> hints.getExecuteLast() == null || !hints.getExecuteLast().contains(e))
            .collect(Collectors.toList());
            
        if (!middleItems.isEmpty()) {
            optimized.addAll(super.optimizeJoinOrder(middleItems));
        }
        
        // Remove middle items from remaining (to handle duplicates if any, though unlikely)
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
}
