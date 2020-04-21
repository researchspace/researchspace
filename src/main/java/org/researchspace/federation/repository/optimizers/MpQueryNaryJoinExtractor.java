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

package org.researchspace.federation.repository.optimizers;

import java.util.ArrayList;
import java.util.List;

import org.bouncycastle.util.StoreException;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.eclipse.rdf4j.sail.federation.optimizers.QueryMultiJoinOptimizer;
import org.researchspace.federation.sparql.SparqlAlgebraUtils;

/**
 * A query optimizer that extracts nested binary joins and groups them into
 * n-ary joins. Partially copies {@link QueryMultiJoinOptimizer}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpQueryNaryJoinExtractor implements QueryOptimizer {

    /**
     * Applies generally applicable optimizations: path expressions are sorted from
     * more to less specific.
     * 
     * @throws StoreException
     */
    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        tupleExpr.visit(new JoinVisitor());
    }

    protected class JoinVisitor extends AbstractQueryModelVisitor<RuntimeException> {

        @Override
        public void meet(LeftJoin leftJoin) {
            leftJoin.getLeftArg().visit(this);
            leftJoin.getRightArg().visit(this);
        }

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof NaryJoin) {
                meetJoin((NaryJoin) node);
            } else {
                super.meetOther(node);
            }
        }

        @Override
        public void meet(Join node) throws RuntimeException {
            meetJoin(node);
        }

        // We don't make any changes inside the SERVICE clauses
        @Override
        public void meet(Service node) throws RuntimeException {
            return;
        }

        public void meetJoin(TupleExpr node) {
            // Recursively get the join arguments
            List<TupleExpr> joinArgs = SparqlAlgebraUtils.getJoinArgs(node, new ArrayList<TupleExpr>());
            // Build new join hierarchy
            NaryJoin replacement = new NaryJoin(joinArgs);
            node.replaceWith(replacement);
        }
    }
}