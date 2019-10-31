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

package com.metaphacts.federation.sparql;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.collect.Sets;

/**
 * Visitor class which retrieves the variables mentioned in a {@link TupleExpr}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class VariableRetrievingVisitor extends AbstractQueryModelVisitor<RepositoryException> {
    private List<Var> involvedVariables;

    private Set<TupleExpr> nodesToIgnore = Sets.newHashSet();

    public List<Var> retrieveInvolvedVariables(OrderElem orderElement) {
        involvedVariables = new ArrayList<Var>();
        orderElement.getExpr().visit(this);

        return involvedVariables;
    }

    public List<Var> retrieveInvolvedVariables(TupleExpr expr) {
        involvedVariables = new ArrayList<Var>();

        expr.visit(this);

        return involvedVariables;
    }

    public List<Var> retrieveInvolvedVariables(TupleExpr expr, Set<TupleExpr> nodesToIgnore) {
        // TODO: fix the use of nodesToIgnore
        // to process correctly e.g., the SELECT * expressions
        // and the nested subqueries.

        // this.nodesToIgnore = nodesToIgnore;
        involvedVariables = new ArrayList<Var>();

        expr.visit(this);

        return involvedVariables;
    }

    @Override
    protected void meetNode(QueryModelNode node) throws RepositoryException {
        if (nodesToIgnore.contains(node))
            return;
        super.meetNode(node);
    }

    @Override
    public void meet(Projection node) throws RepositoryException {
        super.meet(node);
    }

    @Override
    public void meet(Var node) throws RepositoryException {
        if (!node.isAnonymous()) {
            involvedVariables.add(node);
        }
    }
}