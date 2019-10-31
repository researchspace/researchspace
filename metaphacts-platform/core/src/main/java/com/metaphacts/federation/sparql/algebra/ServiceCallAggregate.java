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

package com.metaphacts.federation.sparql.algebra;

import org.eclipse.rdf4j.query.algebra.AbstractAggregateOperator;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.ValueExpr;

/**
 * A {@link ValueExpr} implementation for the service call aggregates.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ServiceCallAggregate extends AbstractAggregateOperator {

    private static final long serialVersionUID = -2260474333050730277L;
    protected String uri;

    public ServiceCallAggregate(String uri, ValueExpr arg) {
        super(arg);
        this.setURI(uri);
    }

    public ServiceCallAggregate(String uri, ValueExpr arg, boolean distinct) {
        super(arg, distinct);
    }

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor) throws X {
        visitor.meetOther(this);
    }
    
    public String getURI() {
        return uri;
    }

    public void setURI(String uri) {
        this.uri = uri;
    }

}