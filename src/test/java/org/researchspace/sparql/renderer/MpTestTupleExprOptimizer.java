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

package org.researchspace.sparql.renderer;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.VariableScopeChange;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

public class MpTestTupleExprOptimizer implements QueryOptimizer {

    protected class JoinVisitor extends AbstractQueryModelVisitor<RuntimeException> {

        @Override
        protected void meetNode(QueryModelNode node) throws RuntimeException {
            super.meetNode(node);
            this.resetScope(node);
        }

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof NaryJoin) {
                meetJoin((NaryJoin) node);
            } else {
                super.meetOther(node);
            }
            this.resetScope(node);
        }

        @Override
        public void meet(Join node) throws RuntimeException {
            meetJoin(node);
            super.meet(node);
        }

        public void meetJoin(TupleExpr node) {
            List<TupleExpr> joinArgs = getJoinArgs(node, new ArrayList<TupleExpr>());

            if (joinArgs.size() > 2) {
                TupleExpr replacement = new NaryJoin(joinArgs);
                if (node != MpTestTupleExprOptimizer.this.getOptimized()) {
                    node.replaceWith(replacement);
                } else {
                    MpTestTupleExprOptimizer.this.setOptimized(replacement);
                }

            }
        }

        protected <L extends List<TupleExpr>> L getJoinArgs(TupleExpr tupleExpr, L joinArgs) {
            if (tupleExpr instanceof NaryJoin) {
                NaryJoin join = (NaryJoin) tupleExpr;
                for (TupleExpr arg : join.getArgs()) {
                    getJoinArgs(arg, joinArgs);
                }
            } else if (tupleExpr instanceof Join) {
                Join join = (Join) tupleExpr;
                getJoinArgs(join.getLeftArg(), joinArgs);
                getJoinArgs(join.getRightArg(), joinArgs);
            } else {
                joinArgs.add(tupleExpr);
            }

            return joinArgs;
        }

        private void resetScope(QueryModelNode node) {
            // ignore variable scope because it doesn't make any difference for our use-case
            // of comparing query structures in test
            if (node instanceof VariableScopeChange) {
                ((VariableScopeChange) node).setVariableScopeChange(false);
            }
        }
    }

    protected TupleExpr optimized;

    public MpTestTupleExprOptimizer() {

    }

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        optimized = tupleExpr;
        tupleExpr.visit(new JoinVisitor());
    }

    public TupleExpr getOptimized() {
        return optimized;
    }

    protected void setOptimized(TupleExpr optimized) {
        this.optimized = optimized;
    }

}
