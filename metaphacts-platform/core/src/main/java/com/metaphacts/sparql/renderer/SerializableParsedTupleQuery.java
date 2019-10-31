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

import java.util.ArrayList;
import java.util.List;

import org.eclipse.rdf4j.query.algebra.Filter;
import org.eclipse.rdf4j.query.algebra.Group;
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;

/**
 * The SerializableParsedTupleQuery class is an intermediate structure holding main parts of a query
 * or a subquery: projection, WHERE clause, GROUP BY clause, ORDER BY clause, LIMIT element, HAVING
 * clause, and BINDINGS clause. These fields are extracted from the {@link ParsedTupleQuery} tree,
 * which doesn't follow the structure of a SPARQL query.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class SerializableParsedTupleQuery extends AbstractSerializableParsedQuery {

    public static enum QueryModifier {
        DISTINCT, REDUCED
    }

    public Projection projection = null;
    public Group groupBy = null;
    public Order orderBy = null;
    public Filter having = null;
    public QueryModifier modifier = null;

    public SerializableParsedTupleQuery() {
        super();
    }

    /**
     * Returns the names of the variables projected by this query (as strings).
     * 
     * @return list of projected variable names
     */
    public List<String> getProjectionResultVars() {
        List<String> res = new ArrayList<String>(
                projection.getProjectionElemList().getElements().size());

        for (ProjectionElem elem : projection.getProjectionElemList().getElements()) {
            res.add(elem.getTargetName());
        }

        return res;
    }

}
