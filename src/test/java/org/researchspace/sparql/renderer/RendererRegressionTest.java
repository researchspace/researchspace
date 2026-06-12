/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.sparql.renderer;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryRoot;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.TripleRef;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Assert;
import org.junit.Test;

import com.google.common.collect.Sets;

/**
 * Regression tests for the forked SPARQL query renderer
 * ({@link ParsedQueryPreprocessor} / {@link PreprocessedQuerySerializer})
 * against query algebra produced by the RDF4J 5.x SPARQL parser.
 */
public class RendererRegressionTest {

    private static final Pattern PATTERN_ANONYMOUS_VAR = Pattern.compile("(_anon_[a-z0-9_]+)");
    private static final Pattern PATTERN_DESCRIBE_ID = Pattern.compile("(_describe_[a-z0-9_]+)");

    private ParsedQuery parseQuery(String query) {
        return QueryParserUtil.parseQuery(QueryLanguage.SPARQL, query, null);
    }

    private String renderWithFork(ParsedQuery query) {
        ParsedQueryPreprocessor preprocessor = new ParsedQueryPreprocessor();
        PreprocessedQuerySerializer serializer = new PreprocessedQuerySerializer();
        if (query instanceof ParsedBooleanQuery) {
            return serializer.serialize(preprocessor.transformToSerialize((ParsedBooleanQuery) query));
        } else if (query instanceof ParsedGraphQuery) {
            return serializer.serialize(preprocessor.transformToSerialize((ParsedGraphQuery) query));
        } else if (query instanceof ParsedTupleQuery) {
            return serializer.serialize(preprocessor.transformToSerialize((ParsedTupleQuery) query));
        }
        throw new IllegalArgumentException("Unsupported query type: " + query.getClass().getName());
    }

    private ParsedQuery reparse(String rendered) {
        try {
            return QueryParserUtil.parseQuery(QueryLanguage.SPARQL, rendered, null);
        } catch (Exception e) {
            throw new AssertionError("Rendered query is not parseable: [" + rendered + "]. Reason: " + e.getMessage(),
                    e);
        }
    }

    private void assertSameAlgebra(ParsedQuery original, ParsedQuery reparsed, String rendered) {
        Assert.assertEquals("The rendered query [" + rendered + "] does not preserve the original algebra",
                normalizeGeneratedVars(original.getTupleExpr().toString()),
                normalizeGeneratedVars(reparsed.getTupleExpr().toString()));
    }

    private String normalizeGeneratedVars(String input) {
        String tmp = replaceVarPattern(input, PATTERN_ANONYMOUS_VAR, "_anon_");
        tmp = replaceVarPattern(tmp, PATTERN_DESCRIBE_ID, "_describe_");
        return tmp;
    }

    private String replaceVarPattern(String input, Pattern pattern, String prefix) {
        Matcher matcher = pattern.matcher(input);
        LinkedHashSet<String> generatedIds = Sets.newLinkedHashSet();
        int i = 0;
        String tmp = input;
        while (matcher.find()) {
            generatedIds.add(matcher.group(1));
        }
        for (String generatedId : generatedIds) {
            i++;
            tmp = tmp.replace(generatedId, prefix + i);
        }
        return tmp;
    }

    // B1: plain projections must not be rendered with a bogus "?null" alias

    @Test
    public void testForkPlainSelectProjection() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?s ?p WHERE { ?s ?p ?o }");
        String rendered = renderWithFork(query);
        Assert.assertFalse("Plain projection must not be rendered with a null alias: [" + rendered + "]",
                rendered.contains("?null"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testForkSingleVarSelectProjection() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?s WHERE { ?s ?p ?o }");
        String rendered = renderWithFork(query);
        Assert.assertFalse("Plain projection must not be rendered with a null alias: [" + rendered + "]",
                rendered.contains("?null"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testForkSelectWithAliasedProjection() throws Exception {
        ParsedQuery query = parseQuery("SELECT (?o AS ?x) WHERE { ?s ?p ?o }");
        String rendered = renderWithFork(query);
        Assert.assertFalse("Aliased projection must not be rendered with a null alias: [" + rendered + "]",
                rendered.contains("?null"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testForkDescribeProjection() throws Exception {
        ParsedQuery query = parseQuery("DESCRIBE ?x WHERE { ?x ?p ?o }");
        String rendered = renderWithFork(query);
        Assert.assertFalse("DESCRIBE projection must not be rendered with a null alias: [" + rendered + "]",
                rendered.contains("?null"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // B3: ASK queries wrapped in a QueryRoot by the RDF4J 5.x parser

    @Test
    public void testForkAskQuery() throws Exception {
        ParsedQuery query = parseQuery("ASK { ?s ?p ?o }");
        String rendered = renderWithFork(query);
        Assert.assertTrue("ASK query incorrectly rendered as: [" + rendered + "]",
                rendered.trim().toUpperCase().startsWith("ASK"));
        ParsedQuery reparsed = reparse(rendered);
        Assert.assertTrue("Rendered ASK query was reparsed as " + reparsed.getClass().getSimpleName(),
                reparsed instanceof ParsedBooleanQuery);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // B4: CONSTRUCT queries must keep their solution modifiers

    @Test
    public void testForkConstructWithLimit() throws Exception {
        ParsedQuery query = parseQuery("CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } LIMIT 10");
        String rendered = renderWithFork(query);
        Assert.assertTrue("LIMIT was dropped from the CONSTRUCT query: [" + rendered + "]",
                rendered.contains("LIMIT 10"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // B2: nested subquery LIMITs must not leak into the outer query

    @Test
    public void testNestedSubqueryLimitsPreserved() throws Exception {
        ParsedQuery query = parseQuery(
                "SELECT ?s WHERE { { SELECT ?s WHERE { ?s ?p ?o } LIMIT 5 } } LIMIT 100");
        String rendered = new MpSparqlQueryRenderer().render(query);
        Assert.assertTrue("The subquery LIMIT was dropped: [" + rendered + "]", rendered.contains("LIMIT 5"));
        Assert.assertTrue("The outer LIMIT was lost: [" + rendered + "]", rendered.contains("LIMIT 100"));
        ParsedQuery reparsed = reparse(rendered);
        TupleExpr expr = reparsed.getTupleExpr();
        Assert.assertTrue(expr instanceof QueryRoot);
        TupleExpr outer = ((QueryRoot) expr).getArg();
        Assert.assertTrue("Expected the outer Slice as the query root, was " + outer.getSignature(),
                outer instanceof Slice);
        Assert.assertEquals("Wrong outer LIMIT in the rendered query: [" + rendered + "]", 100,
                ((Slice) outer).getLimit());
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testForkConstructWithOrderByAndLimit() throws Exception {
        ParsedQuery query = parseQuery("CONSTRUCT { ?s <http://example.org/p> ?o } WHERE { ?s ?q ?o } "
                + "ORDER BY ?s LIMIT 10");
        String rendered = renderWithFork(query);
        Assert.assertTrue("LIMIT was dropped from the CONSTRUCT query: [" + rendered + "]",
                rendered.contains("LIMIT 10"));
        Assert.assertTrue("ORDER BY was dropped from the CONSTRUCT query: [" + rendered + "]",
                rendered.contains("ORDER BY"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // B5: the SILENT flag of SERVICE clauses must be preserved

    @Test
    public void testServiceSilentPreserved() throws Exception {
        ParsedQuery query = parseQuery(
                "SELECT ?s WHERE { SERVICE SILENT <http://example.org/sparql> { ?s ?p ?o } }");
        String rendered = new MpSparqlQueryRenderer().render(query);
        ParsedQuery reparsed = reparse(rendered);
        List<Service> services = collectNodes(reparsed.getTupleExpr(), Service.class);
        Assert.assertEquals("Expected exactly one SERVICE clause in: [" + rendered + "]", 1, services.size());
        Assert.assertTrue("The SILENT flag was dropped from the SERVICE clause: [" + rendered + "]",
                services.get(0).isSilent());
    }

    // B6: RDF-star triple patterns and expressions

    @Test
    public void testRdfStarTriplePattern() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?v WHERE { <<?s ?p ?o>> <http://example.org/q> ?v }");
        String rendered = new MpSparqlQueryRenderer().render(query);
        ParsedQuery reparsed = reparse(rendered);
        Assert.assertEquals("Expected exactly one triple reference in: [" + rendered + "]", 1,
                collectNodes(reparsed.getTupleExpr(), TripleRef.class).size());
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testRdfStarBindTripleRef() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?t WHERE { ?a ?b ?c . BIND(<<?a ?b ?c>> AS ?t) }");
        String rendered = new MpSparqlQueryRenderer().render(query);
        ParsedQuery reparsed = reparse(rendered);
        Assert.assertEquals("Expected exactly one triple reference in: [" + rendered + "]", 1,
                collectNodes(reparsed.getTupleExpr(), TripleRef.class).size());
        assertSameAlgebra(query, reparsed, rendered);
    }

    @Test
    public void testRdfStarValueExprTripleRefInProjection() throws Exception {
        ParsedQuery query = parseQuery("SELECT (<<?s ?p ?o>> AS ?ref) WHERE { ?s ?p ?o }");
        String rendered = new MpSparqlQueryRenderer().render(query);
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // B7: custom aggregate function calls

    @Test
    public void testCustomAggregateFunctionCall() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?s (<http://example.org/myagg>(DISTINCT ?o) AS ?agg) "
                + "WHERE { ?s ?p ?o } GROUP BY ?s");
        String rendered = new MpSparqlQueryRenderer().render(query);
        Assert.assertTrue("The custom aggregate was dropped: [" + rendered + "]",
                rendered.contains("<http://example.org/myagg>(DISTINCT"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    // Literal escaping: control characters should be escaped like in rdf4j's RenderUtils

    @Test
    public void testLiteralControlCharacterEscaping() throws Exception {
        ParsedQuery query = parseQuery("SELECT ?s WHERE { ?s ?p \"a\\tb\\fc\\bd\" }");
        String rendered = new MpSparqlQueryRenderer().render(query);
        Assert.assertTrue("Tab character was not escaped: [" + rendered + "]", rendered.contains("\\t"));
        Assert.assertTrue("Form feed character was not escaped: [" + rendered + "]", rendered.contains("\\f"));
        Assert.assertTrue("Backspace character was not escaped: [" + rendered + "]", rendered.contains("\\b"));
        ParsedQuery reparsed = reparse(rendered);
        assertSameAlgebra(query, reparsed, rendered);
    }

    private <T extends QueryModelNode> List<T> collectNodes(TupleExpr expr, Class<T> type) {
        List<T> nodes = new ArrayList<>();
        expr.visit(new AbstractQueryModelVisitor<RuntimeException>() {
            @Override
            protected void meetNode(QueryModelNode node) throws RuntimeException {
                if (type.isInstance(node)) {
                    nodes.add(type.cast(node));
                }
                super.meetNode(node);
            }
        });
        return nodes;
    }
}
