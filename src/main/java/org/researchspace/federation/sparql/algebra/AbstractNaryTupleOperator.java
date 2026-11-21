/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.sparql.algebra;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.rdf4j.query.algebra.AbstractQueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

public abstract class AbstractNaryTupleOperator extends AbstractQueryModelNode implements TupleExpr {

    private static final long serialVersionUID = 1L;

    private List<TupleExpr> args = new ArrayList<>();

    public AbstractNaryTupleOperator() {
    }

    public AbstractNaryTupleOperator(List<TupleExpr> args) {
        setArgs(args);
    }

    public List<TupleExpr> getArgs() {
        return args;
    }

    public TupleExpr getArg(int i) {
        return args.get(i);
    }

    public void setArgs(List<TupleExpr> args) {
        this.args = args;
        for (TupleExpr arg : args) {
            arg.setParentNode(this);
        }
    }

    public void addArg(TupleExpr arg) {
        args.add(arg);
        arg.setParentNode(this);
    }

    public void removeArg(TupleExpr arg) {
        args.remove(arg);
        arg.setParentNode(null);
    }

    @Override
    public <X extends Exception> void visitChildren(QueryModelVisitor<X> visitor) throws X {
        for (TupleExpr arg : args) {
            arg.visit(visitor);
        }
    }

    @Override
    public void replaceChildNode(QueryModelNode current, QueryModelNode replacement) {
        if (replaceNodeInList(args, (TupleExpr) current, (TupleExpr) replacement)) {
            return;
        }
        throw new IllegalArgumentException("Node is not a child node: " + current);
    }

    @Override
    public java.util.Set<String> getBindingNames() {
        java.util.Set<String> bindingNames = new java.util.LinkedHashSet<>();
        for (TupleExpr arg : args) {
            bindingNames.addAll(arg.getBindingNames());
        }
        return bindingNames;
    }

    @Override
    public java.util.Set<String> getAssuredBindingNames() {
        java.util.Set<String> bindingNames = new java.util.LinkedHashSet<>();
        for (TupleExpr arg : args) {
            bindingNames.addAll(arg.getAssuredBindingNames());
        }
        return bindingNames;
    }

    @Override
    public AbstractNaryTupleOperator clone() {
        AbstractNaryTupleOperator clone = (AbstractNaryTupleOperator) super.clone();
        clone.args = new ArrayList<>(args.size());
        for (TupleExpr arg : args) {
            clone.addArg(arg.clone());
        }
        return clone;
    }
}
