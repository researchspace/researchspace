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

import java.util.List;

import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.sail.federation.algebra.AbstractNaryTupleOperator;

/**
 * A UNION expression with multiple arguments.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class NaryUnion extends AbstractNaryTupleOperator {

    private static final long serialVersionUID = -4197799623486507729L;

    public NaryUnion() {
    }

    public NaryUnion(TupleExpr... args) {
        super(args);
    }

    public NaryUnion(List<? extends TupleExpr> args) {
        super(args);
    }

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor)
        throws X {
        visitor.meetOther(this);
    }

    @Override
    public NaryUnion clone() { 
        return (NaryUnion)super.clone();
    }

}