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

package org.researchspace.federation.sparql.rank.optimizers;

import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Distinct;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Reduced;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.federation.sparql.NaryUnion;
import org.researchspace.federation.sparql.rank.algebra.RankedNaryJoin;

/**
 * Optimizes the LIMIT operation: tries to push it down the query tree.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class SliceOptimizer extends AbstractQueryModelVisitor<RepositoryException> implements QueryOptimizer {

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        tupleExpr.visit(this);
    }

    @Override
    public void meet(Slice node) throws RepositoryException {
        super.meet(node);
        optimizeSliceExpression(node);
    }

    protected void optimizeSliceExpression(Slice node) {
        TupleExpr sliceArgument = node.getArg();

        if (handleTupleExpression(node, sliceArgument)) {
            node.replaceWith(node.getArg());
        }
    }

    protected boolean handleTupleExpression(final Slice topSlice, TupleExpr exp) {
        if (exp instanceof Union) {
            return handleUnion(topSlice, (Union) exp);
        } else if (exp instanceof NaryUnion) {
            return handleNaryUnion(topSlice, (NaryUnion) exp);
        } else if (exp instanceof RankedNaryJoin) {
            return handleRankedNaryJoin(topSlice, (RankedNaryJoin) exp);
        } else if (exp instanceof Service) {
            return false;
        } else if (exp instanceof Projection) {
            return handleTupleExpression(topSlice, ((Projection) exp).getArg());
        } else if (exp instanceof Distinct) {
            return handleTupleExpression(topSlice, ((Distinct) exp).getArg());
        } else if (exp instanceof Reduced) {
            return handleTupleExpression(topSlice, ((Reduced) exp).getArg());
        } else {
            // attach the slice to the right place in the tree
            QueryModelNode position = getRightPositionInUnaryOperatorSequence(exp);
            if (!position.equals(topSlice.getArg())) {
                TupleExpr tmp = (TupleExpr) position.clone();
                Slice slice = new Slice(tmp, 0, topSlice.getOffset() + topSlice.getLimit() + 1);
                slice.setParentNode(position.getParentNode());
                position.getParentNode().replaceChildNode(position, slice);
                return true;
            } else {
                return false;
            }
        }
    }

    protected boolean handleRankedNaryJoin(final Slice topSlice, RankedNaryJoin naryJoin) {
        long offset = topSlice.getOffset() < 0 ? 0 : topSlice.getOffset();
        naryJoin.setLimit(topSlice.getLimit() + offset);
        return false;
    }

    protected boolean handleNaryUnion(final Slice topSlice, NaryUnion naryUnion) {

        List<? extends TupleExpr> args = naryUnion.getArgs();

        Slice subSlice;

        for (TupleExpr arg : args) {
            long offset = topSlice.getOffset() < 0 ? 0 : topSlice.getOffset();
            subSlice = new Slice(arg, 0, topSlice.getLimit() + offset);
            subSlice.setParentNode(naryUnion);
            naryUnion.replaceChildNode(arg, subSlice);

            optimizeSliceExpression(subSlice);
        }

        return false;
    }

    protected boolean handleUnion(final Slice topSlice, Union union) {
        long offset = topSlice.getOffset() < 0 ? 0 : topSlice.getOffset();
        Slice subSlice;
        TupleExpr arg = union.getLeftArg();
        subSlice = new Slice(arg, 0, topSlice.getLimit() + offset);
        subSlice.setParentNode(union);
        union.setLeftArg(subSlice);
        optimizeSliceExpression(subSlice);
        arg = union.getRightArg();
        subSlice = new Slice(arg, 0, topSlice.getLimit() + offset);
        subSlice.setParentNode(union);
        union.setRightArg(subSlice);
        optimizeSliceExpression(subSlice);

        return false;
    }

    protected QueryModelNode getRightPositionInUnaryOperatorSequence(TupleExpr currentNode) {
        // a slice must be above both projection and distinct/reduced modifier
        if (currentNode.getParentNode() instanceof Projection) {
            return getRightPositionInUnaryOperatorSequence((TupleExpr) currentNode.getParentNode());
        } else if (currentNode.getParentNode() instanceof Distinct) {
            return getRightPositionInUnaryOperatorSequence((Distinct) currentNode.getParentNode());
        } else if (currentNode.getParentNode() instanceof Reduced) {
            return getRightPositionInUnaryOperatorSequence((Reduced) currentNode.getParentNode());
        }
        return currentNode;
    }

}