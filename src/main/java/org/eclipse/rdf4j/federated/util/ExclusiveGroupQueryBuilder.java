/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.eclipse.rdf4j.federated.util;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;
import org.eclipse.rdf4j.federated.algebra.ExclusiveTupleExpr;
import org.eclipse.rdf4j.federated.evaluation.iterator.BoundJoinVALUESConversionIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.impl.EmptyBindingSet;
import org.eclipse.rdf4j.model.IRI;

/**
 * Helper for building VALUES-based SPARQL queries for ExclusiveGroup bind joins.
 * <p>
 * Placed in {@code org.eclipse.rdf4j.federated.util} to access
 * {@link QueryStringUtil}'s protected methods ({@code constructJoinArg},
 * {@code appendValue}) via same-package access.
 * </p>
 */
public class ExclusiveGroupQueryBuilder {

    /**
     * Build a VALUES-based SPARQL query for an ExclusiveGroup left bind join.
     * <p>
     * For example, with 3 bindings and an ExclusiveGroup of:
     * <pre>
     *   ?rec ex:hasObjectId ?objectid .
     *   ?rec ex:hasLabel ?label .
     * </pre>
     * Produces:
     * <pre>
     * SELECT ?rec ?objectid ?label ?__index WHERE {
     *   VALUES (?objectid ?__index) { ("1" "0") ("2" "1") ("3" "2") }
     *   ?rec ex:hasObjectId ?objectid .
     *   ?rec ex:hasLabel ?label .
     * }
     * </pre>
     */
    public static String buildBoundJoinVALUES(ExclusiveGroup group, List<BindingSet> bindings) {
        // Build WHERE body using QueryStringUtil.constructJoinArg (protected, same-package)
        Set<String> varNames = new LinkedHashSet<>();
        StringBuilder whereBody = new StringBuilder();

        for (ExclusiveTupleExpr expr : group.getExclusiveExpressions()) {
            whereBody.append(QueryStringUtil.constructJoinArg(expr, varNames, EmptyBindingSet.getInstance()));
        }

        StringBuilder query = new StringBuilder();
        query.append("SELECT ");

        for (String var : varNames) {
            query.append(" ?").append(var);
        }
        query.append(" ?").append(BoundJoinVALUESConversionIteration.INDEX_BINDING_NAME);

        query.append(" ");
        appendDatasetClause(query, group.getQueryInfo().getDataset());
        query.append("WHERE {");

        // Determine which variables from the group's patterns are actually bound in the input
        Set<String> boundVarNames = new LinkedHashSet<>();
        for (String var : varNames) {
            for (BindingSet b : bindings) {
                if (b.hasBinding(var)) {
                    boundVarNames.add(var);
                    break;
                }
            }
        }

        if (!boundVarNames.isEmpty()) {
            query.append(" VALUES (");
            for (String var : boundVarNames) {
                query.append("?").append(var).append(" ");
            }
            query.append(" ?__index) { ");

            int index = 0;
            for (BindingSet b : bindings) {
                query.append("(");
                for (String var : boundVarNames) {
                    if (b.hasBinding(var)) {
                        // Uses QueryStringUtil.appendValue (protected, same-package)
                        QueryStringUtil.appendValue(query, b.getValue(var)).append(" ");
                    } else {
                        query.append("UNDEF ");
                    }
                }
                query.append("\"").append(index).append("\") ");
                index++;
            }
            query.append(" } ");
        }

        query.append(whereBody);
        query.append(" }");

        return query.toString();
    }

    /**
     * Append FROM / FROM NAMED clauses for the dataset (reimplemented here since
     * {@link QueryStringUtil#appendDatasetClause} is private).
     */
    private static StringBuilder appendDatasetClause(StringBuilder sb, Dataset dataset) {
        if (dataset == null) {
            return sb;
        }
        for (IRI g : dataset.getDefaultGraphs()) {
            sb.append("FROM <").append(g.stringValue()).append("> ");
        }
        for (IRI g : dataset.getNamedGraphs()) {
            sb.append("FROM NAMED <").append(g.stringValue()).append("> ");
        }
        return sb;
    }
}
