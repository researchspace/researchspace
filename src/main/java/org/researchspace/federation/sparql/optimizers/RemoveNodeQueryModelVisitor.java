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

package org.researchspace.federation.sparql.optimizers;

import org.eclipse.rdf4j.query.algebra.BinaryTupleOperator;
import org.eclipse.rdf4j.query.algebra.EmptySet;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.UnaryTupleOperator;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.sail.federation.algebra.AbstractNaryTupleOperator;
import org.researchspace.federation.sparql.SparqlAlgebraUtils;

/**
 * A query visitor that removes a given {@link TupleExpr} from a query tree.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class RemoveNodeQueryModelVisitor extends AbstractQueryModelVisitor<Exception> {

    final TupleExpr toRemove;
    private TupleExpr scope = null;

    public RemoveNodeQueryModelVisitor(TupleExpr toRemove) {
        this.toRemove = toRemove;
    }

    public RemoveNodeQueryModelVisitor(TupleExpr toRemove, TupleExpr scope) {
        this.toRemove = toRemove;
        this.scope = scope;
    }

    protected boolean isInScope(TupleExpr node) {
        if (scope == null) {
            return true;
        }
        TupleExpr expr = node;
        return SparqlAlgebraUtils.getScopeRoot(expr).equals(scope);
    }

    @Override
    public void meetOther(QueryModelNode node) throws Exception {
        if ((node instanceof AbstractNaryTupleOperator) && isInScope((TupleExpr) node)) {
            ((AbstractNaryTupleOperator) node).removeArg(this.toRemove);
        }
        super.meetOther(node);
    }

    protected void processBinaryOperator(BinaryTupleOperator operator) throws Exception {
        QueryModelNode parent = operator.getParentNode();
        if (operator.getLeftArg().equals(toRemove) && isInScope(operator)) {
            TupleExpr rightArg = operator.getRightArg();
            parent.replaceChildNode(operator, rightArg);
            rightArg.setParentNode(parent);
        } else if (operator.getRightArg().equals(toRemove) && isInScope(operator)) {
            TupleExpr leftArg = operator.getLeftArg();
            parent.replaceChildNode(operator, leftArg);
            leftArg.setParentNode(parent);
        }
    }

    @Override
    protected void meetUnaryTupleOperator(UnaryTupleOperator node) throws Exception {
        if (node.getArg().equals(toRemove)) {
            node.replaceChildNode(toRemove, new EmptySet());
        }
        super.meetUnaryTupleOperator(node);
    }

    @Override
    public void meet(Join node) throws Exception {
        processBinaryOperator(node);
        super.meet(node);
    }

    @Override
    public void meet(LeftJoin node) throws Exception {
        processBinaryOperator(node);
        super.meet(node);
    }

    @Override
    public void meet(Union node) throws Exception {
        processBinaryOperator(node);
        super.meet(node);
    }

}