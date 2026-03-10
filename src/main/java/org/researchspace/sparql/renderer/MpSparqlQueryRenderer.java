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

import org.eclipse.rdf4j.queryrender.sparql.experimental.SparqlQueryRenderer;

/**
 * An alternative implementation of the SPARQL query renderer (more complete
 * than the RDF4J {@link SPARQLQueryRenderer}) that doesn't cover, e.g.,
 * <ul>
 * <li>SERVICE clauses</li>
 * <li>GROUP BY aggregations</li>
 * <li>subqueries</li>
 * </ul>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpSparqlQueryRenderer extends SparqlQueryRenderer {

    public MpSparqlQueryRenderer() {
        super();
    }

    /**
     * Renders a single {@link org.eclipse.rdf4j.model.Value} as string.
     * 
     * @param val an RDF {@link org.eclipse.rdf4j.model.Value}
     * @return string representation of {@code val}
     */
    public String renderValue(org.eclipse.rdf4j.model.Value val) {
        StringBuilder builder = new StringBuilder();
        MpSparqlQueryRendererUtils.writeAsSparqlValue(val, builder, true);
        return builder.toString();
    }

}