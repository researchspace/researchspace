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

package org.eclipse.rdf4j.sail.federation.optimizers;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.researchspace.federation.sparql.MpOwnedTupleExpr;

/**
 * Remove redundant {@link MpOwnedTupleExpr}. (Copies
 * {@link OwnedTupleExprPruner}, but uses {@link MpOwnedTupleExpr}).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpOwnedTupleExprPruner extends AbstractQueryModelVisitor<RuntimeException> implements QueryOptimizer {

    private MpOwnedTupleExpr owned;

    @Override
    public void optimize(TupleExpr query, Dataset dataset, BindingSet bindings) {
        owned = null; // NOPMD
        query.visit(this);
    }

    @Override
    public void meetOther(QueryModelNode node) {
        if (node instanceof MpOwnedTupleExpr) {
            meetOwnedTupleExpr((MpOwnedTupleExpr) node);
        } else {
            super.meetOther(node);
        }
    }

    private void meetOwnedTupleExpr(MpOwnedTupleExpr node) {
        if (owned == null) {
            owned = node;
            super.meetOther(node);
            owned = null; // NOPMD
        } else {
            // no nested OwnedTupleExpr
            TupleExpr replacement = node.getArg().clone();
            node.replaceWith(replacement);
            replacement.visit(this);
        }
    }

}