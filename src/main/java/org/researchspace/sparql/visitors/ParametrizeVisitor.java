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

package org.researchspace.sparql.visitors;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.algebra.*;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.helpers.TupleExprs;
import java.util.*;

/**
 * Rewrites a query to bind values for specified parameters without changing
 * output binding names of the query.
 *
 * <p>
 * Example:
 * </p>
 * 
 * <pre>
 * <code>
 *     ParsedQuery query = parseQuery("SELECT ?s ?o WHERE { ?s ?p ?o }")
 *     // parameters is a map { "p": IRI("some:iri") }
 *     query.getTupleExpr().visit(new ParametrizeVisitor(parameters))
 *     render(query) // -> "SELECT ?s ?o WHERE { ?s &lt;some:iri&gt; ?p }"
 * </code>
 * </pre>
 */
public class ParametrizeVisitor extends AbstractQueryModelVisitor<RuntimeException> {
    private final Map<String, Value> parameters;

    public ParametrizeVisitor(Map<String, Value> parameters) {
        this.parameters = parameters;
    }

    @Override
    public void meet(ProjectionElemList node) throws RuntimeException {
        super.meet(node);

        for (ProjectionElem elem : node.getElements()) {
            String sourceName = elem.getSourceName();
            if (sourceName != null && parameters.containsKey(sourceName)) {
                Value value = parameters.get(sourceName);
                elem.setSourceName(elem.getTargetName());
                elem.setSourceExpression(new ExtensionElem(TupleExprs.createConstVar(value), sourceName));
            }
        }
    }

    @Override
    public void meet(Var node) throws RuntimeException {
        super.meet(node);
        if (!node.isAnonymous() && !node.hasValue()) {
            Value parameter = parameters.get(node.getName());
            if (parameter != null) {
                node.setValue(parameter);
            }
        }
    }
}
