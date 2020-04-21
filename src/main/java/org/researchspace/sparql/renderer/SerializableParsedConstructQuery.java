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

package org.researchspace.sparql.renderer;

import java.util.List;

import org.eclipse.rdf4j.query.algebra.Filter;
import org.eclipse.rdf4j.query.algebra.Group;
import org.eclipse.rdf4j.query.algebra.MultiProjection;
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.algebra.ProjectionElemList;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;

import com.google.common.collect.Lists;

/**
 * The SerializableParsedTupleQuery class is an intermediate structure holding
 * main parts of a query or a subquery: projection, WHERE clause, GROUP BY
 * clause, ORDER BY clause, LIMIT element, HAVING clause, and BINDINGS clause.
 * These fields are extracted from the {@link ParsedTupleQuery} tree, which
 * doesn't follow the structure of a SPARQL query.
 */
public class SerializableParsedConstructQuery extends AbstractSerializableParsedQuery {

    public MultiProjection projection = null;
    public Group groupBy = null;
    public Order orderBy = null;
    public Filter having = null;
    public boolean describe = false;

    public SerializableParsedConstructQuery() {

    }

    /**
     * Returns the names of the variables projected by this query (as strings).
     * 
     * @return list of projected variable names
     */
    public List<String> getProjectionResultVars() {
        List<String> res = Lists.newArrayList();
        for (ProjectionElemList proj : projection.getProjections()) {
            for (ProjectionElem elem : proj.getElements()) {
                res.add(elem.getTargetName());
            }
        }
        return res;
    }

}
