/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import static org.junit.Assert.*;
import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.rdf4j.federated.EndpointManager;
import org.eclipse.rdf4j.federated.FederationContext;
import org.eclipse.rdf4j.federated.algebra.NJoin;
import org.eclipse.rdf4j.federated.algebra.StatementSource;
import org.eclipse.rdf4j.federated.algebra.StatementSource.StatementSourceType;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.StatementPattern.Scope;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.EmptyBindingSet;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.query.impl.SimpleDataset;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Test;

/**
 * Unit tests for the SPARQL string reconstruction of {@link ExclusiveSubquery}.
 */
public class ExclusiveSubqueryTest {

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    private QueryInfo mockQueryInfo() {
        QueryInfo queryInfo = mock(QueryInfo.class);
        FederationContext federationContext = mock(FederationContext.class);
        EndpointManager endpointManager = mock(EndpointManager.class);
        Endpoint endpoint = mock(Endpoint.class);
        when(queryInfo.getFederationContext()).thenReturn(federationContext);
        when(federationContext.getEndpointManager()).thenReturn(endpointManager);
        when(endpointManager.getEndpoint(anyString())).thenReturn(endpoint);
        return queryInfo;
    }

    @Test
    public void testToSparqlBodyWrapsNamedGraphScopeWithContextVar() {
        StatementPattern stmt = new StatementPattern(Scope.NAMED_CONTEXTS,
                new Var("s"), new Var("p"), new Var("o"), new Var("g"));

        Set<String> varNames = new HashSet<>();
        String body = ExclusiveSubquery.toSparqlBody(stmt, varNames, EmptyBindingSet.getInstance());

        assertTrue("Named graph scope must be wrapped in GRAPH ?g { ... }: " + body,
                body.trim().startsWith("GRAPH ?g {"));
        assertTrue("Triple pattern must be inside the GRAPH wrapper: " + body,
                body.contains("?s ?p ?o . "));
        assertTrue("GRAPH wrapper must be closed: " + body, body.trim().endsWith("}"));
        assertTrue("Context var must be projected", varNames.contains("g"));
    }

    @Test
    public void testToSparqlBodyWrapsNamedGraphScopeWithConstantContext() {
        Var g = new Var("g", vf.createIRI("http://example.org/graph1"));
        StatementPattern stmt = new StatementPattern(Scope.NAMED_CONTEXTS,
                new Var("s"), new Var("p"), new Var("o"), g);

        Set<String> varNames = new HashSet<>();
        String body = ExclusiveSubquery.toSparqlBody(stmt, varNames, EmptyBindingSet.getInstance());

        assertTrue("Named graph scope must be wrapped in GRAPH <iri> { ... }: " + body,
                body.trim().startsWith("GRAPH <http://example.org/graph1> {"));
        assertFalse("Constant context must not be projected", varNames.contains("g"));
    }

    @Test
    public void testToSelectQueryIncludesDatasetClauseAndGraphScope() {
        QueryInfo queryInfo = mockQueryInfo();
        SimpleDataset dataset = new SimpleDataset();
        dataset.addDefaultGraph(vf.createIRI("http://example.org/defaultGraph"));
        dataset.addNamedGraph(vf.createIRI("http://example.org/namedGraph"));
        when(queryInfo.getDataset()).thenReturn(dataset);

        ExclusiveSubquery subquery = createSubquery(queryInfo);
        String query = subquery.toSelectQuery(EmptyBindingSet.getInstance());

        assertTrue("Query must contain the FROM clause: " + query,
                query.contains("FROM <http://example.org/defaultGraph>"));
        assertTrue("Query must contain the FROM NAMED clause: " + query,
                query.contains("FROM NAMED <http://example.org/namedGraph>"));
        assertTrue("Query must contain the GRAPH wrapper: " + query,
                query.contains("GRAPH ?g {"));
    }

    @Test
    public void testToSelectQueryBoundJoinVALUESIncludesDatasetClauseAndGraphScope() {
        QueryInfo queryInfo = mockQueryInfo();
        SimpleDataset dataset = new SimpleDataset();
        dataset.addDefaultGraph(vf.createIRI("http://example.org/defaultGraph"));
        dataset.addNamedGraph(vf.createIRI("http://example.org/namedGraph"));
        when(queryInfo.getDataset()).thenReturn(dataset);

        ExclusiveSubquery subquery = createSubquery(queryInfo);

        MapBindingSet b1 = new MapBindingSet();
        b1.addBinding("o", vf.createLiteral("v1"));
        MapBindingSet b2 = new MapBindingSet();
        b2.addBinding("o", vf.createLiteral("v2"));

        String query = subquery.toSelectQueryBoundJoinVALUES(Arrays.asList(b1, b2));

        assertTrue("Query must contain the FROM clause: " + query,
                query.contains("FROM <http://example.org/defaultGraph>"));
        assertTrue("Query must contain the FROM NAMED clause: " + query,
                query.contains("FROM NAMED <http://example.org/namedGraph>"));
        assertTrue("Query must contain the GRAPH wrapper: " + query,
                query.contains("GRAPH ?g {"));
        assertTrue("Query must contain the ?__index column: " + query,
                query.contains("?__index"));
        assertTrue("Query must contain a VALUES row for the first binding: " + query,
                query.contains("\"0\""));
        assertTrue("Query must contain a VALUES row for the second binding: " + query,
                query.contains("\"1\""));
    }

    @Test
    public void testLiteralEscapingMatchesUpstream() {
        QueryInfo queryInfo = mockQueryInfo();
        StatementPattern pattern = new StatementPattern(
                new Var("s"),
                new Var("p", vf.createIRI("http://example.org/ns#p")),
                new Var("o"));
        NJoin njoin = new NJoin(Arrays.asList(pattern, plainPattern()), queryInfo);
        ExclusiveSubquery subquery = new ExclusiveSubquery(njoin,
                new StatementSource("default", StatementSourceType.REMOTE), queryInfo);

        MapBindingSet bindings = new MapBindingSet();
        bindings.addBinding("o", vf.createLiteral("it's a \"test\"\nline2"));

        String query = subquery.toSelectQuery(bindings);

        assertTrue("Literal must be triple-quoted with escaped quotes: " + query,
                query.contains("'''it\\'s a \\\"test\\\"\nline2'''"));
        // the generated query must be parseable SPARQL
        QueryParserUtil.parseTupleQuery(QueryLanguage.SPARQL, query, null);
    }

    @Test
    public void testToSelectQueryWithAllVarsBound() {
        QueryInfo queryInfo = mockQueryInfo();
        StatementPattern pattern = new StatementPattern(
                new Var("s"),
                new Var("p", vf.createIRI("http://example.org/ns#p")),
                new Var("o"));
        NJoin njoin = new NJoin(Arrays.asList(pattern, plainPattern()), queryInfo);
        ExclusiveSubquery subquery = new ExclusiveSubquery(njoin,
                new StatementSource("default", StatementSourceType.REMOTE), queryInfo);

        MapBindingSet bindings = new MapBindingSet();
        bindings.addBinding("s", vf.createIRI("http://example.org/s1"));
        bindings.addBinding("o", vf.createLiteral("v1"));
        bindings.addBinding("o2", vf.createLiteral("v2"));

        String query = subquery.toSelectQuery(bindings);

        assertFalse("Query must not have an empty projection: " + query,
                query.contains("SELECT  WHERE"));
        // the generated query must be parseable SPARQL
        QueryParserUtil.parseTupleQuery(QueryLanguage.SPARQL, query, null);
    }

    private StatementPattern plainPattern() {
        return new StatementPattern(
                new Var("s"),
                new Var("p2", vf.createIRI("http://example.org/ns#p2")),
                new Var("o2"));
    }

    private ExclusiveSubquery createSubquery(QueryInfo queryInfo) {
        StatementPattern graphPattern = new StatementPattern(Scope.NAMED_CONTEXTS,
                new Var("s"),
                new Var("p1", vf.createIRI("http://example.org/ns#p1")),
                new Var("o"),
                new Var("g"));
        StatementPattern plainPattern = new StatementPattern(
                new Var("s"),
                new Var("p2", vf.createIRI("http://example.org/ns#p2")),
                new Var("o2"));

        NJoin njoin = new NJoin(Arrays.asList(graphPattern, plainPattern), queryInfo);
        StatementSource owner = new StatementSource("default", StatementSourceType.REMOTE);
        return new ExclusiveSubquery(njoin, owner, queryInfo);
    }
}
