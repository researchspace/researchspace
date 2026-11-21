/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.optimizers;

import org.eclipse.rdf4j.federated.algebra.BoundJoinExclusiveGroup;
import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Replaces {@link ExclusiveGroup} nodes with {@link BoundJoinExclusiveGroup}
 * (which implements {@code BoundJoinTupleExpr}).
 * <p>
 * This enables FedX's built-in VALUES-based bind join for OPTIONAL clauses
 * with multi-pattern ExclusiveGroup right sides, preventing the N-query
 * blow-up from {@code ControlledWorkerLeftJoin}.
 * </p>
 */
public class BoundJoinExclusiveGroupOptimizer implements QueryOptimizer {

    private static final Logger log = LoggerFactory.getLogger(BoundJoinExclusiveGroupOptimizer.class);

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        try {
            tupleExpr.visit(new ExclusiveGroupReplacer());
        } catch (Exception e) {
            log.warn("Error replacing ExclusiveGroup nodes: {}", e.getMessage());
            log.debug("Details:", e);
        }
    }

    private static class ExclusiveGroupReplacer extends AbstractQueryModelVisitor<Exception> {

        @Override
        protected void meetNode(QueryModelNode node) throws Exception {
            if (node instanceof ExclusiveGroup && !(node instanceof BoundJoinExclusiveGroup)) {
                ExclusiveGroup group = (ExclusiveGroup) node;
                BoundJoinExclusiveGroup replacement = new BoundJoinExclusiveGroup(group);

                QueryModelNode parent = group.getParentNode();
                if (parent != null) {
                    parent.replaceChildNode(group, replacement);
                    if (log.isDebugEnabled()) {
                        log.debug("Replaced ExclusiveGroup with BoundJoinExclusiveGroup ({})",
                                group.getId());
                    }
                }
            }
            super.meetNode(node);
        }
    }
}
