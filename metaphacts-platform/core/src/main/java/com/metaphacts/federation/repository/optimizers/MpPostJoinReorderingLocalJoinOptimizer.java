/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.federation.repository.optimizers;

import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

import com.github.jsonldjava.shaded.com.google.common.collect.Lists;
import com.metaphacts.federation.sparql.MpOwnedTupleExpr;
import com.metaphacts.federation.sparql.algebra.ServiceCallTupleExpr;

/**
 * This optimizer was added to perform additional post-processing step to merge join operands 
 * which can be sent together to a remote endpoint.
 * It could happen that we had join operands, some of which were affected by a query hint.
 * For example:
 *   :a rdfs:label ?label .
 *   :a :myValueCode ?code .
 *   ephedra:Prior ephedra:executeFirst "true" .
 *   SERVICE :blah {
 *      ?results :hasCode ?code .
 *   }
 * In this case, Ephedra cannot merge the first two operands in {@link MpFederationJoinOptimizerWithHints}:
 * one of them is affected by a query hint.
 * Afterwards, in {@link MpQueryJoinOrderOptimizer}, these two operands are reordered according to the query hint.
 * Only now we can go through the join operands again and merge them. 
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpPostJoinReorderingLocalJoinOptimizer
        extends AbstractQueryModelVisitor<RepositoryException> implements QueryOptimizer {

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        tupleExpr.visit(this);
    }

    @Override
    public void meetOther(QueryModelNode node) throws RepositoryException {
        if (node instanceof NaryJoin) {
            meetNaryJoin((NaryJoin) node);
        } else if (node instanceof MpOwnedTupleExpr) {
            return;
        } else if (node instanceof ServiceCallTupleExpr) {
            return;
        }
        super.meetOther(node);
    }
    
    public void meetNaryJoin(NaryJoin node) throws RepositoryException {
        List<? extends TupleExpr> args = node.getArgs();
        if (node.getArgs().size() < 2) {
            return;
        }
        boolean needsReplacement = false;
        List<TupleExpr> replacementArgs = Lists.newArrayList();
        TupleExpr previousOperand = args.iterator().next();
        for (int i = 1; i < args.size(); i++) {
            TupleExpr currentOperand = args.get(i);
            if ((previousOperand instanceof MpOwnedTupleExpr) && (currentOperand instanceof MpOwnedTupleExpr)) {
                RepositoryConnection prevOwner = ((MpOwnedTupleExpr) previousOperand).getOwner();
                RepositoryConnection currentOwner = ((MpOwnedTupleExpr) previousOperand).getOwner();
                if ((prevOwner != null) && (currentOwner != null) && (prevOwner.equals(currentOwner))) {
                    previousOperand = merge((MpOwnedTupleExpr) previousOperand,
                            (MpOwnedTupleExpr) currentOperand);
                    needsReplacement = true;
                    continue;
                }
            }
            replacementArgs.add(previousOperand);
            previousOperand = currentOperand;
        }
        replacementArgs.add(previousOperand);
        if (needsReplacement) {
            node.replaceWith(new NaryJoin(replacementArgs));
        }
    }
    
    protected MpOwnedTupleExpr merge(MpOwnedTupleExpr first, MpOwnedTupleExpr second) {
        TupleExpr firstArg = first.getArg();
        if (firstArg instanceof NaryJoin) {
            ((NaryJoin) firstArg).addArg(second.getArg());
        } else {
            NaryJoin newJoin = new NaryJoin(first.getArg(), second.getArg());
            first.setArg(newJoin);
        }
        return first;
    }

    @Override
    public void meet(Service node) throws RepositoryException {
        return;
    }
    
    
    

}
