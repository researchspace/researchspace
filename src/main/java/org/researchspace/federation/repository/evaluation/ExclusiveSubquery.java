/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.order.AvailableStatementOrder;
import org.eclipse.rdf4j.federated.algebra.ExclusiveGroup;
import org.eclipse.rdf4j.federated.algebra.ExclusiveStatement;
import org.eclipse.rdf4j.federated.algebra.BoundJoinTupleExpr;
import org.eclipse.rdf4j.federated.algebra.ExclusiveTupleExpr;
import org.eclipse.rdf4j.federated.algebra.FilterValueExpr;
import org.eclipse.rdf4j.federated.algebra.NJoin;
import org.eclipse.rdf4j.federated.algebra.NUnion;
import org.eclipse.rdf4j.federated.algebra.NodeFactory;
import org.eclipse.rdf4j.federated.algebra.StatementSource;
import org.eclipse.rdf4j.federated.algebra.StatementTupleExpr;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.federated.util.QueryAlgebraUtil;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.AbstractQueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.EmptyBindingSet;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * An algebra node that wraps an arbitrary algebra tree (including unions) that
 * is exclusively destined for a single endpoint. Unlike {@link ExclusiveGroup},
 * which can only hold flat {@link ExclusiveTupleExpr} items, this node can wrap
 * any tree structure including {@link NUnion} and {@link NJoin} nodes.
 *
 * <p>
 * This enables "subquery pushdown": when all children of an NJoin target the
 * same endpoint, the entire NJoin is replaced with this node, which sends a
 * single SPARQL query to the endpoint instead of evaluating each child
 * separately with per-binding joins at the federation layer.
 * </p>
 *
 * <p>
 * SPARQL reconstruction is done via {@link #toSparqlBody(TupleExpr, Set, BindingSet)},
 * which recursively walks the algebra tree and produces the WHERE clause body.
 * </p>
 */
public class ExclusiveSubquery extends AbstractQueryModelNode
        implements StatementTupleExpr, ExclusiveTupleExpr, BoundJoinTupleExpr {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(ExclusiveSubquery.class);

    private final TupleExpr wrappedExpr;
    private final StatementSource owner;
    private final String id;
    private final transient QueryInfo queryInfo;
    private final transient Endpoint ownedEndpoint;
    private final Set<String> freeVars;

    public ExclusiveSubquery(TupleExpr wrappedExpr, StatementSource owner, QueryInfo queryInfo) {
        this.wrappedExpr = wrappedExpr;
        this.owner = owner;
        this.id = NodeFactory.getNextId();
        this.queryInfo = queryInfo;
        this.ownedEndpoint = queryInfo.getFederationContext()
                .getEndpointManager().getEndpoint(owner.getEndpointID());
        // Compute free vars from the wrapped expression
        this.freeVars = new HashSet<>(QueryAlgebraUtil.getFreeVars(wrappedExpr));
    }

    public TupleExpr getWrappedExpr() {
        return wrappedExpr;
    }

    public Endpoint getOwnedEndpoint() {
        return ownedEndpoint;
    }

    // ── StatementTupleExpr / ExclusiveTupleExpr ──

    @Override
    public StatementSource getOwner() {
        return owner;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public List<StatementSource> getStatementSources() {
        return Collections.singletonList(owner);
    }

    @Override
    public boolean hasFreeVarsFor(BindingSet bindings) {
        for (String var : freeVars) {
            if (!bindings.hasBinding(var)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public List<String> getFreeVars() {
        return new ArrayList<>(freeVars);
    }

    @Override
    public int getFreeVarCount() {
        return freeVars.size();
    }

    @Override
    public QueryInfo getQueryInfo() {
        return queryInfo;
    }

    // ── TupleExpr ──

    @Override
    public Set<String> getBindingNames() {
        return wrappedExpr.getBindingNames();
    }

    @Override
    public Set<String> getAssuredBindingNames() {
        return wrappedExpr.getAssuredBindingNames();
    }

    @Override
    public Set<Var> getSupportedOrders(AvailableStatementOrder tripleSource) {
        return Collections.emptySet();
    }

    @Override
    public void setOrder(Var var) {
        // not supported
    }

    @Override
    public Var getOrder() {
        return null;
    }

    // ── Visitor pattern ──

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor) throws X {
        visitor.meetOther(this);
    }

    @Override
    public <X extends Exception> void visitChildren(QueryModelVisitor<X> visitor) throws X {
        wrappedExpr.visit(visitor);
    }

    @Override
    public void replaceChildNode(QueryModelNode current, QueryModelNode replacement) {
        throw new UnsupportedOperationException("ExclusiveSubquery does not support child replacement");
    }

    @Override
    public ExclusiveSubquery clone() {
        return (ExclusiveSubquery) super.clone();
    }

    @Override
    public String getSignature() {
        return super.getSignature() + " @" + owner.getEndpointID();
    }

    // ── Evaluation ──

    @Override
    public CloseableIteration<BindingSet> evaluate(BindingSet bindings)
            throws QueryEvaluationException {
        try {
            String sparql = toSelectQuery(bindings);
            if (log.isDebugEnabled()) {
                log.debug("ExclusiveSubquery evaluate @{}: {}",
                        owner.getEndpointID(), sparql);
            }
            // Use the FilterValueExpr overload: the generated query is always a SELECT
            // (regardless of the top-level query type) and the input bindings — which
            // were substituted into the query text — must be re-inserted into the
            // result rows (InsertBindingsIteration).
            return ownedEndpoint.getTripleSource()
                    .getStatements(sparql, bindings, (FilterValueExpr) null, queryInfo);
        } catch (Exception e) {
            throw new QueryEvaluationException(e);
        }
    }

    /**
     * Construct a SELECT query string for this subquery with the given bindings
     * substituted into the algebra tree.
     *
     * @param bindings the bindings to substitute
     * @return the SPARQL SELECT query string
     */
    public String toSelectQuery(BindingSet bindings) {
        Set<String> varNames = new HashSet<>();
        String body = toSparqlBody(wrappedExpr, varNames, bindings);

        StringBuilder res = new StringBuilder();
        res.append("SELECT ");
        if (varNames.isEmpty()) {
            // All free vars are covered by the bindings: an empty projection would be
            // invalid SPARQL. Project * — the endpoint returns a single empty row if
            // the pattern matches, and the input bindings are re-inserted afterwards
            // (cf. upstream IllegalQueryException fallback to a hasStatements check).
            res.append("*");
        }
        for (String var : varNames) {
            res.append(" ?").append(var);
        }
        res.append(" ");
        appendDatasetClause(res, queryInfo.getDataset());
        res.append("WHERE { ").append(body).append(" }");
        return res.toString();
    }

    /**
     * Construct a SELECT query with a VALUES clause for batched bind join.
     * <p>
     * Instead of sending N separate queries (one per binding), this produces
     * a single query like:
     * <pre>
     * SELECT ?identifier ?existingRecord ?__index WHERE {
     *   VALUES (?citableReference ?__index) { ("YBBK/P/3" "0") ("RAIL 144" "1") ... }
     *   { ?identifier &lt;P190&gt; ?citableReference . } UNION { ?identifier &lt;rdfs:label&gt; ?citableReference . }
     *   ?existingRecord &lt;P1&gt; ?identifier . ?identifier &lt;P2&gt; &lt;crn&gt; .
     * }
     * </pre>
     *
     * @param bindings the list of bindings to batch
     * @return the SPARQL SELECT query string with VALUES
     */
    public String toSelectQueryBoundJoinVALUES(List<BindingSet> bindings) {
        // Build body with empty bindings to get all vars unsubstituted
        Set<String> varNames = new LinkedHashSet<>();
        String body = toSparqlBody(wrappedExpr, varNames, EmptyBindingSet.getInstance());

        // Determine which variables from the body are actually bound in the input bindings
        Set<String> boundVarNames = new LinkedHashSet<>();
        for (String var : varNames) {
            for (BindingSet b : bindings) {
                if (b.hasBinding(var)) {
                    boundVarNames.add(var);
                    break;
                }
            }
        }

        StringBuilder query = new StringBuilder();
        query.append("SELECT ");
        for (String var : varNames) {
            query.append(" ?").append(var);
        }
        // Add __index for BindLeftJoinIteration/BoundJoinVALUESConversionIteration
        String indexBindingName = org.eclipse.rdf4j.federated.evaluation.iterator
                .BoundJoinVALUESConversionIteration.INDEX_BINDING_NAME;
        query.append(" ?").append(indexBindingName);

        query.append(" ");
        appendDatasetClause(query, queryInfo.getDataset());
        query.append("WHERE { ");

        // Always append the VALUES clause — even when no variables are shared with
        // the input bindings (cross-product join), the ?__index column is required
        // by BindLeftJoinIteration / BoundJoinVALUESConversionIteration.
        org.eclipse.rdf4j.federated.util.ExclusiveGroupQueryBuilder.appendValuesBlock(
                query, boundVarNames, bindings, false);

        query.append(body).append(" }");
        return query.toString();
    }

    // ── SPARQL body reconstruction ──

    /**
     * Whether {@link #toSparqlBody} can reconstruct this algebra node. This is
     * the eligibility predicate the join optimizer consults before folding a
     * single-source tree into an {@link ExclusiveSubquery}: keep it in sync
     * with the branches of {@link #toSparqlBody} — a node admitted here but
     * not rendered there turns into an
     * {@link UnsupportedOperationException} at evaluation time (e.g. property
     * paths pushed to one source become {@code ExclusiveArbitraryLengthPath},
     * which has no rendering branch).
     */
    public static boolean canRender(TupleExpr expr) {
        if (expr instanceof StatementPattern) {
            return true;
        }
        if (expr instanceof ExclusiveGroup) {
            for (ExclusiveTupleExpr e : ((ExclusiveGroup) expr).getExclusiveExpressions()) {
                if (!(e instanceof TupleExpr) || !canRender((TupleExpr) e)) {
                    return false;
                }
            }
            return true;
        }
        if (expr instanceof NUnion) {
            for (TupleExpr child : ((NUnion) expr).getArgs()) {
                if (!canRender(child)) {
                    return false;
                }
            }
            return true;
        }
        if (expr instanceof NJoin) {
            for (TupleExpr child : ((NJoin) expr).getArgs()) {
                if (!canRender(child)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Recursively convert an algebra tree into a SPARQL body string.
     * Handles ExclusiveStatement, ExclusiveGroup, NUnion, NJoin, and
     * plain StatementPattern nodes.
     *
     * @param expr     the algebra node
     * @param varNames accumulator for free variable names (for SELECT projection)
     * @param bindings the current bindings to substitute
     * @return the SPARQL body string
     */
    public static String toSparqlBody(TupleExpr expr, Set<String> varNames, BindingSet bindings) {
        if (expr instanceof StatementPattern) {
            return constructStatement((StatementPattern) expr, varNames, bindings);
        }

        if (expr instanceof ExclusiveGroup) {
            StringBuilder sb = new StringBuilder();
            for (ExclusiveTupleExpr e : ((ExclusiveGroup) expr).getExclusiveExpressions()) {
                sb.append(toSparqlBody((TupleExpr) e, varNames, bindings));
            }
            return sb.toString();
        }

        if (expr instanceof NUnion) {
            NUnion union = (NUnion) expr;
            List<TupleExpr> args = union.getArgs();
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < args.size(); i++) {
                if (i > 0) sb.append(" UNION ");
                sb.append("{ ").append(toSparqlBody(args.get(i), varNames, bindings)).append("} ");
            }
            return sb.toString();
        }

        if (expr instanceof NJoin) {
            NJoin join = (NJoin) expr;
            StringBuilder sb = new StringBuilder();
            for (TupleExpr arg : join.getArgs()) {
                sb.append(toSparqlBody(arg, varNames, bindings));
            }
            return sb.toString();
        }

        // Fallback: try to handle unknown nodes by visiting children
        log.warn("ExclusiveSubquery.toSparqlBody: unhandled node type {}, falling back to toString",
                expr.getClass().getSimpleName());
        throw new UnsupportedOperationException(
                "Cannot convert to SPARQL body: " + expr.getClass().getSimpleName());
    }

    /**
     * Construct a triple pattern string "s p o . " with bindings substituted.
     * Mirrors QueryStringUtil.constructStatement but is self-contained. Patterns
     * with named-context scope are wrapped in {@code GRAPH ctx { ... }}.
     */
    private static String constructStatement(StatementPattern stmt, Set<String> varNames, BindingSet bindings) {
        StringBuilder sb = new StringBuilder();
        if (stmt.getScope().equals(StatementPattern.Scope.NAMED_CONTEXTS)) {
            sb.append("GRAPH ");
            appendVar(sb, stmt.getContextVar(), varNames, bindings);
            sb.append(" { ");
        }
        appendVar(sb, stmt.getSubjectVar(), varNames, bindings);
        sb.append(" ");
        appendVar(sb, stmt.getPredicateVar(), varNames, bindings);
        sb.append(" ");
        appendVar(sb, stmt.getObjectVar(), varNames, bindings);
        sb.append(" . ");
        if (stmt.getScope().equals(StatementPattern.Scope.NAMED_CONTEXTS)) {
            sb.append("} ");
        }
        return sb.toString();
    }

    private static void appendVar(StringBuilder sb, Var var, Set<String> varNames, BindingSet bindings) {
        if (!var.hasValue()) {
            if (bindings.hasBinding(var.getName())) {
                appendValue(sb, bindings.getValue(var.getName()));
            } else {
                varNames.add(var.getName());
                sb.append("?").append(var.getName());
            }
        } else {
            appendValue(sb, var.getValue());
        }
    }

    /**
     * Value serialization delegates to FedX's QueryStringUtil (via the
     * same-package bridge in ExclusiveGroupQueryBuilder) so all bind-join
     * builders share one implementation — including its fail-fast behavior
     * for value types that cannot appear in a SPARQL query.
     */
    private static void appendValue(StringBuilder sb, org.eclipse.rdf4j.model.Value value) {
        org.eclipse.rdf4j.federated.util.ExclusiveGroupQueryBuilder.appendValue(sb, value);
    }

    /**
     * Append FROM / FROM NAMED clauses for the dataset (mirrors
     * {@code QueryStringUtil.appendDatasetClause}).
     */
    private static StringBuilder appendDatasetClause(StringBuilder sb, Dataset dataset) {
        if (dataset == null) {
            return sb;
        }
        for (org.eclipse.rdf4j.model.IRI g : dataset.getDefaultGraphs()) {
            sb.append("FROM <").append(g.stringValue()).append("> ");
        }
        for (org.eclipse.rdf4j.model.IRI g : dataset.getNamedGraphs()) {
            sb.append("FROM NAMED <").append(g.stringValue()).append("> ");
        }
        return sb;
    }

}

