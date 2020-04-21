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

import org.eclipse.rdf4j.query.algebra.Modify;
import org.eclipse.rdf4j.query.algebra.UpdateExpr;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;

import com.google.common.collect.Lists;

/**
 * The SerializableParsedTupleQuery class is an intermediate structure holding
 * main parts of a query or a subquery: projection, WHERE clause, GROUP BY
 * clause, ORDER BY clause, LIMIT element, HAVING clause, and BINDINGS clause.
 * These fields are extracted from the {@link ParsedTupleQuery} tree, which
 * doesn't follow the structure of a SPARQL query.
 */
public class SerializableParsedUpdate extends AbstractSerializableParsedQuery {

//    public MultiProjection projection = null;
    public UpdateExpr updateExpr = null;

//    public Group groupBy = null;
//    public Order orderBy = null;
//    public Filter having = null;

    public SerializableParsedUpdate() {

    }

    /**
     * Returns the names of the variables projected by this query (as strings).
     * 
     * @return list of projected variable names
     */
    public List<String> getProjectionResultVars() {
        List<String> res = Lists.newArrayList();

        if (updateExpr instanceof Modify) {
            Modify modify = (Modify) updateExpr;
            if (modify.getInsertExpr() != null) {
                res.addAll(modify.getInsertExpr().getBindingNames());
            }
            if (modify.getDeleteExpr() != null) {
                res.addAll(modify.getDeleteExpr().getBindingNames());
            }
        }
        return res;
    }

}
