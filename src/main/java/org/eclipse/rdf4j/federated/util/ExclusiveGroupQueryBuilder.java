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
import org.eclipse.rdf4j.query.algebra.Service;
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

        // Always emit the VALUES clause — even when no variables are shared with the
        // input bindings (cross-product join), the ?__index column is required by
        // BindLeftJoinIteration / BoundJoinVALUESConversionIteration, mirroring
        // QueryStringUtil.selectQueryStringBoundJoinVALUES.
        appendValuesBlock(query, boundVarNames, bindings, false);

        query.append(whereBody);
        query.append(" }");

        return query.toString();
    }

    /**
     * Build a VALUES-based SPARQL query for a bound LEFT join of a SERVICE
     * clause body, to be executed directly at the member endpoint.
     * <p>
     * The service body is forwarded verbatim (prologue included) via
     * {@link Service#getSelectQueryString(Set)}; a {@code VALUES} clause with
     * the input rows and a {@code ?__index} column is injected right after the
     * WHERE brace. The endpoint echoes {@code ?__index} back, which lets
     * {@code BindLeftJoinIteration} join result rows to their input row and
     * re-emit unmatched input rows NULL-extended.
     * </p>
     * <p>
     * For example, with input rows binding {@code ?entity} and a service body
     * of {@code OPTIONAL { ?entity ex:img ?img }}:
     * <pre>
     * SELECT ?img ?__index WHERE {
     *   VALUES (?__index ?entity) { ("0" &lt;http://...&gt;) ("1" UNDEF) }
     *   OPTIONAL { ?entity ex:img ?img }
     * }
     * </pre>
     */
    public static String buildServiceBoundLeftJoinVALUES(Service service, List<BindingSet> bindings) {
        Set<String> serviceVars = service.getServiceVars();

        // variables shared between the input rows and the service body go into VALUES
        Set<String> relevantVars = new LinkedHashSet<>();
        for (BindingSet bs : bindings) {
            for (String name : bs.getBindingNames()) {
                if (serviceVars.contains(name)) {
                    relevantVars.add(name);
                }
            }
        }

        // project the free service variables plus the index column
        Set<String> projectionVars = new LinkedHashSet<>(serviceVars);
        projectionVars.removeAll(relevantVars);
        projectionVars.add(BoundJoinVALUESConversionIteration.INDEX_BINDING_NAME);

        String queryString = service.getSelectQueryString(projectionVars);
        if (!queryString.contains("?" + BoundJoinVALUESConversionIteration.INDEX_BINDING_NAME)) {
            // Sub-SELECT service bodies are forwarded verbatim by
            // Service.getSelectQueryString (the projection vars are ignored), so
            // the ?__index column the bind join relies on cannot be injected.
            // Callers must evaluate such bodies per binding; failing fast here
            // beats the NullPointerException the missing echo would cause in
            // BindLeftJoinIteration.
            throw new IllegalArgumentException(
                    "SERVICE body does not support the VALUES bind-join rewrite (sub-SELECT body?): "
                            + queryString);
        }

        StringBuilder values = new StringBuilder();
        appendValuesBlock(values, relevantVars, bindings, true);

        // the first '{' is the WHERE brace (the prologue contains no braces)
        StringBuilder query = new StringBuilder(queryString);
        query.insert(query.indexOf("{") + 1, values);
        return query.toString();
    }

    /**
     * Bridge to {@link QueryStringUtil#appendValue} (protected, reachable via
     * this class's package). Single source of truth for SPARQL value
     * serialization in the bind-join query builders — private copies drift
     * (an earlier copy silently emitted unescaped quotes for unsupported
     * value types where upstream fails fast).
     */
    public static StringBuilder appendValue(StringBuilder sb, org.eclipse.rdf4j.model.Value value) {
        return QueryStringUtil.appendValue(sb, value);
    }

    /**
     * Emit the {@code VALUES (…vars… ?__index) { rows }} block shared by all
     * bind-join query builders. Rows not binding a variable emit {@code UNDEF};
     * the {@code ?__index} column carries the 0-based row position consumed by
     * {@code BindLeftJoinIteration}/{@code BoundJoinVALUESConversionIteration}.
     *
     * @param indexFirst whether the index column leads (service bound left
     *                   join) or trails (exclusive group / subquery bound join)
     *                   the variable columns
     */
    public static void appendValuesBlock(StringBuilder query, java.util.Collection<String> vars,
            List<BindingSet> bindings, boolean indexFirst) {
        String indexColumn = "?" + BoundJoinVALUESConversionIteration.INDEX_BINDING_NAME;
        query.append(" VALUES (");
        if (indexFirst) {
            query.append(indexColumn).append(" ");
        }
        for (String var : vars) {
            query.append("?").append(var).append(" ");
        }
        if (!indexFirst) {
            query.append(indexColumn);
        }
        query.append(") { ");
        int index = 0;
        for (BindingSet b : bindings) {
            query.append("(");
            if (indexFirst) {
                query.append("\"").append(index).append("\" ");
            }
            for (String var : vars) {
                if (b.hasBinding(var)) {
                    QueryStringUtil.appendValue(query, b.getValue(var)).append(" ");
                } else {
                    query.append("UNDEF ");
                }
            }
            if (!indexFirst) {
                query.append("\"").append(index).append("\"");
            }
            query.append(") ");
            index++;
        }
        query.append("} ");
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
