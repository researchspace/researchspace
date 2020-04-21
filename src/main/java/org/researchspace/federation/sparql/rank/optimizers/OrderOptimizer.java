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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Distinct;
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Reduced;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.sail.federation.algebra.AbstractNaryTupleOperator;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.researchspace.federation.sparql.FederationSparqlAlgebraUtils;
import org.researchspace.federation.sparql.NaryUnion;
import org.researchspace.federation.sparql.rank.algebra.RankedNaryJoin;
import org.researchspace.federation.sparql.rank.algebra.RankedNaryUnion;

import com.google.common.collect.Maps;

/**
 * An optimizer class to process queries with order.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class OrderOptimizer extends AbstractQueryModelVisitor<RepositoryException> implements QueryOptimizer {

    private boolean insideService = false;

    protected class OrderTupleExprHandlerVisitor extends AbstractQueryModelVisitor<RepositoryException> {

    }

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        tupleExpr.visit(this);
    }

    @Override
    public void meet(Order node) throws RepositoryException {
        super.meet(node);
        optimizeOrderExpression(node, false);
    }

    @Override
    public void meetOther(QueryModelNode node) throws RepositoryException {
        boolean oldInsideService = insideService;
        if (node instanceof Service) {
            this.insideService = true;
        }
        super.meetOther(node);
        insideService = oldInsideService;
    }

    protected void optimizeOrderExpression(Order node, boolean insideService) {
        TupleExpr orderArgument = node.getArg();

        if (handleTupleExpression(node, orderArgument, insideService)) {
            node.replaceWith(node.getArg());
        }
    }

    protected boolean handleTupleExpression(final Order topOrder, TupleExpr exp, boolean insideService) {
        if (exp instanceof RankedNaryJoin) {
            // just ignore for now
        } else if (exp instanceof RankedNaryUnion) {
            // just ignore for now
        } else if (exp instanceof NaryJoin) {
            return handleNTuple(topOrder, (NaryJoin) exp, insideService);
        } else if ((exp instanceof NaryUnion) && (!insideService)) {
            return handleNTuple(topOrder, (NaryUnion) exp, insideService);
        } else if (exp instanceof Projection) {
            return handleTupleExpression(topOrder, ((Projection) exp).getArg(), insideService);
        } else if (exp instanceof Distinct) {
            return handleTupleExpression(topOrder, ((Distinct) exp).getArg(), insideService);
        } else if (exp instanceof Reduced) {
            return handleTupleExpression(topOrder, ((Reduced) exp).getArg(), insideService);
        } else if (exp instanceof Service) {
            return false;
            // return handleTupleExpression(topOrder, ((Service)exp).getArg(), true);
        }
        // cannot move down - must attach to the first appropriate place.
        // attach the order to the current place in the tree
        QueryModelNode position = getRightPositionInUnaryOperatorSequence(exp);
        if (!position.equals(topOrder.getArg())) {
            TupleExpr tmp = (TupleExpr) position.clone();
            Order order = new Order(tmp, topOrder.getElements());
            order.setParentNode(position.getParentNode());
            position.getParentNode().replaceChildNode(position, order);
            return true;
        } else {
            return false;
        }

    }

    protected QueryModelNode getRightPositionInUnaryOperatorSequence(TupleExpr currentNode) {
        // order must be above projection but below the distinct/reduced modifier
        if (currentNode.getParentNode() instanceof Projection) {
            return getRightPositionInUnaryOperatorSequence((Projection) currentNode.getParentNode());
        }
        return currentNode;
    }

    protected boolean handleNTuple(final Order topOrder, AbstractNaryTupleOperator nTuple, boolean insideService) {
        List<? extends TupleExpr> args = nTuple.getArgs();
        Map<TupleExpr, List<OrderElem>> sortedArgs = Maps.newHashMap();
        List<TupleExpr> unsortedArgs = new ArrayList<TupleExpr>();

        boolean replaceWithRankTuple = false;
        List<OrderElem> relevantOrderElements;

        for (TupleExpr arg : args) {

            relevantOrderElements = FederationSparqlAlgebraUtils.getRelevantOrderElements(arg, topOrder.getElements());

            if (!relevantOrderElements.isEmpty()) {
                replaceWithRankTuple = true;
                sortedArgs.put(arg, relevantOrderElements);
            } else {
                unsortedArgs.add(arg);
            }
        }

        if (replaceWithRankTuple) {

            AbstractNaryTupleOperator nRankTuple = null;
            if (nTuple instanceof NaryJoin) {
                nRankTuple = new RankedNaryJoin(new ArrayList<TupleExpr>(sortedArgs.keySet()), unsortedArgs,
                        topOrder.getElements());
            } else if (nTuple instanceof NaryUnion) {
                nRankTuple = new RankedNaryUnion(new ArrayList<TupleExpr>(sortedArgs.keySet()), unsortedArgs,
                        topOrder.getElements());
            }
            if (nRankTuple != null) {
                nTuple.replaceWith(nRankTuple);
                Order subOrder;
                for (Entry<TupleExpr, List<OrderElem>> entry : sortedArgs.entrySet()) {
                    subOrder = new Order(entry.getKey(), entry.getValue());
                    nRankTuple.replaceChildNode(entry.getKey(), subOrder);
                    subOrder.setParentNode(nRankTuple);
                    // entry.getKey().replaceWith(subOrder);
                    optimizeOrderExpression(subOrder, insideService);
                    // handleTupleExpression(subOrder, entry.getKey(), insideService);
                }
            }

            return true;
        }
        return false;
    }

}