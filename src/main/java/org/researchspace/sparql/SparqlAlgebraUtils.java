/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.sparql;

import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.researchspace.sparql.renderer.AbstractSerializableParsedQuery;
import org.researchspace.sparql.renderer.ParsedQueryPreprocessor;

public class SparqlAlgebraUtils {
    public static TupleExpr getWhereClause(ParsedQuery theQuery) {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        AbstractSerializableParsedQuery toSerialize;
        if (theQuery instanceof ParsedTupleQuery) {
            toSerialize = parserVisitor.transformToSerialize((ParsedTupleQuery) theQuery);
        } else if (theQuery instanceof ParsedBooleanQuery) {
            toSerialize = parserVisitor.transformToSerialize((ParsedBooleanQuery) theQuery);
        } else if (theQuery instanceof ParsedGraphQuery) {
            toSerialize = parserVisitor.transformToSerialize((ParsedGraphQuery) theQuery);
        } else {
            throw new UnsupportedOperationException("Only SELECT, ASK, and CONSTRUCT queries are supported");
        }
        return toSerialize.whereClause;
    }
}
