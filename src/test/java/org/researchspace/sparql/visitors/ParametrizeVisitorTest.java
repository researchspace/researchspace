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

import com.google.common.collect.ImmutableMap;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.sparql.renderer.MpSparqlQueryRenderer;
import org.researchspace.sparql.visitors.ParametrizeVisitor;

import java.util.Map;

/**
 * Test cases for {@link ParametrizeVisitor}
 */
public class ParametrizeVisitorTest extends AbstractIntegrationTest {
    private final Map<String, Value> parameters;

    public ParametrizeVisitorTest() {
        ValueFactory vf = SimpleValueFactory.getInstance();
        this.parameters = ImmutableMap.of("iri", vf.createIRI("test:iri"), "literal", vf.createLiteral("TestLiteral"),
                "langLiteral", vf.createLiteral("TestLangLiteral", "en"), "blank", vf.createBNode("testBlank"));
    }

    @Test
    public void testSingleTriples() throws Exception {
        assertParametrizationResult("SELECT ?s ?p WHERE { ?s ?p ?iri . ?s ?p ?literal . }",
                "SELECT ?s ?p WHERE { ?s ?p <test:iri> . ?s ?p \"TestLiteral\"^^<" + XMLSchema.STRING + "> . }");
    }

    @Test
    public void testBind() throws Exception {
        assertParametrizationResult("SELECT ?s WHERE { BIND(?langLiteral AS ?s) . }",
                "SELECT ?s WHERE {{} BIND(\"TestLangLiteral\"@en AS ?s) . }");
    }

    @Test
    public void testPredicateVariable() throws Exception {
        assertParametrizationResult("SELECT ?s ?o WHERE { ?s ?iri ?o . }", "SELECT ?s ?o WHERE { ?s <test:iri> ?o . }");
    }

    @Test
    public void testInsideFilter() throws Exception {
        assertParametrizationResult(
                "SELECT ?s ?o WHERE { ?s ?p ?o . FILTER((?iri + \"s\"^^<" + XMLSchema.STRING + ">) = \"abc\"^^<"
                        + XMLSchema.STRING + ">) }",
                "SELECT ?s ?o WHERE { ?s ?p ?o . FILTER((<test:iri> + \"s\"^^<" + XMLSchema.STRING + ">) = \"abc\"^^<"
                        + XMLSchema.STRING + ">) }");
    }

    @Test
    public void testProjection() throws Exception {
        assertParametrizationResult("SELECT ?iri ?p ?o WHERE { ?iri ?p ?o . }",
                "SELECT (<test:iri> AS ?iri) ?p ?o WHERE { <test:iri> ?p ?o . }");
    }

    private void assertParametrizationResult(String source, String expected) throws Exception {
        ParsedQuery parsedQuery = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, source, null);
        parsedQuery.getTupleExpr().visit(new ParametrizeVisitor(this.parameters));
        String rendered = new MpSparqlQueryRenderer().render(parsedQuery);
        Assert.assertEquals(expected.replaceAll("\\s+", ""), rendered.replaceAll("\\s+", ""));
    }
}
