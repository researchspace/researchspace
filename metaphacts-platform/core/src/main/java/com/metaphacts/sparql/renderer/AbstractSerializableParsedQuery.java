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

package com.metaphacts.sparql.renderer;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;

import jersey.repackaged.com.google.common.collect.Maps;

public class AbstractSerializableParsedQuery {

    /**
     * A map that maps all subquery projections within this query to their corresponding
     * SerializableParsedTupleQuery instances.
     */
    public Map<Projection, SerializableParsedTupleQuery> subQueriesByProjection = new HashMap<Projection, SerializableParsedTupleQuery>();
    public TupleExpr whereClause = null;
    public Slice limit = null;
    public BindingSetAssignment bindings = null;
    public Map<String, ExtensionElem> extensionElements = Maps.newHashMap();
    public Dataset dataset = null;
    public Map<String, Var> nonAnonymousVars = Maps.newHashMap();

    public AbstractSerializableParsedQuery() {
        super();
    }

}