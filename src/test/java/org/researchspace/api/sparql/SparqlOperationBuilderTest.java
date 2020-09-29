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

package org.researchspace.api.sparql;

import static org.hamcrest.CoreMatchers.containsString;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;
import org.researchspace.api.sparql.SparqlOperationBuilder;
import org.researchspace.junit.ResearchSpaceGuiceTestModule;
import org.researchspace.junit.RepositoryRule;

import com.google.common.collect.Lists;
import com.google.inject.Inject;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public class SparqlOperationBuilderTest {
    @Inject
    @Rule
    public RepositoryRule repositoryRule;

    @Rule
    public ExpectedException exception = ExpectedException.none();

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    private static final IRI researchspaceURI = vf.createIRI("http://www.researchspace.org");

    private static final Model testModel = new LinkedHashModel(
            Lists.newArrayList(vf.createStatement(researchspaceURI, RDF.TYPE, FOAF.ORGANIZATION),
                    vf.createStatement(researchspaceURI, FOAF.NAME, vf.createLiteral("ResearchSpace"))));

    @Before
    public void addTriples() throws RepositoryException {
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(testModel);
        }
    }

    @Test
    public void testTuple() throws Exception {
        SparqlOperationBuilder<TupleQuery> builder = SparqlOperationBuilder
                .<TupleQuery>create("SELECT ?subject ?object WHERE {?subject a ?object} LIMIT 10", TupleQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            TupleQuery op = builder.build(con);
            assertTrue(op instanceof TupleQuery);
            TupleQueryResult tqr = null;
            try {
                tqr = op.evaluate();
                assertTrue(tqr.hasNext());
                BindingSet binding = tqr.next();
                assertEquals(researchspaceURI, binding.getValue("subject"));
                assertEquals(FOAF.ORGANIZATION, binding.getValue("object"));
                assertFalse(tqr.hasNext());
            } finally {
                tqr.close();
            }
        }
    }

    @Test
    public void testBoolean() throws Exception {
        SparqlOperationBuilder<BooleanQuery> builder = SparqlOperationBuilder
                .<BooleanQuery>create("ASK {?subject a <http://xmlns.com/foaf/0.1/Organization>}", BooleanQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            BooleanQuery op = builder.build(con);
            assertTrue(op instanceof BooleanQuery);
            assertTrue(op.evaluate());
        }
    }

    @Test
    public void testGraph() throws Exception {
        SparqlOperationBuilder<GraphQuery> builder = SparqlOperationBuilder
                .<GraphQuery>create("CONSTRUCT{?s ?p ?o} WHERE {?s ?p ?o}", GraphQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            GraphQuery op = builder.build(con);
            assertTrue(op instanceof GraphQuery);
            GraphQueryResult gqr = null;
            try {
                gqr = op.evaluate();
                assertTrue(Models.isomorphic(testModel, QueryResults.asModel(gqr)));
            } finally {
                gqr.close();
            }
        }
    }

    @Test
    public void testDescribe() throws Exception {
        SparqlOperationBuilder<GraphQuery> builder = SparqlOperationBuilder
                .<GraphQuery>create("DESCRIBE <" + researchspaceURI.stringValue() + ">", GraphQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            GraphQuery op = builder.build(con);
            assertTrue(op instanceof GraphQuery);
            GraphQueryResult gqr = null;
            try {
                gqr = op.evaluate();
                assertTrue(Models.isomorphic(testModel, QueryResults.asModel(gqr)));
            } finally {
                gqr.close();
            }
        }
    }

    @Test
    public void testUpdate() throws Exception {
        SparqlOperationBuilder<Update> builder = SparqlOperationBuilder
                .<Update>create("DELETE{?s ?p ?o} WHERE {?s ?p ?o}", Update.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            Update op = builder.build(con);
            assertTrue(op instanceof Update);
            assertEquals(2, con.size());
            op.execute();
            assertEquals(0, con.size());
        }
    }

    @Test
    public void testCastException() throws RepositoryException, MalformedQueryException {
        SparqlOperationBuilder<BooleanQuery> builder = SparqlOperationBuilder
                .<BooleanQuery>create("SELECT * WHERE {?a ?b ?c} LIMIT 10", BooleanQuery.class);

        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            exception.expect(IllegalArgumentException.class);
            exception.expectMessage(containsString("Query is a SPARQL SELECT query. Expected a boolean query."));
            builder.build(con);
        }

    }

    @Test
    public void testResolveThis() throws RepositoryException, MalformedQueryException, QueryEvaluationException {
        SparqlOperationBuilder<BooleanQuery> builder = SparqlOperationBuilder
                .<BooleanQuery>create("ASK {?? a <http://xmlns.com/foaf/0.1/Organization>}", BooleanQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            BooleanQuery op = builder.resolveThis(researchspaceURI).build(con);
            assertTrue(op instanceof BooleanQuery);
            assertTrue(op.evaluate());
        }
    }

    @Test
    public void testResolveUser() throws RepositoryException, MalformedQueryException, QueryEvaluationException {
        SparqlOperationBuilder<BooleanQuery> builder = SparqlOperationBuilder.<BooleanQuery>create(
                "ASK {?__useruri__ a <http://xmlns.com/foaf/0.1/Organization>}", BooleanQuery.class);
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            BooleanQuery op = builder.resolveUser(researchspaceURI).build(con);
            assertTrue(op instanceof BooleanQuery);
            assertTrue(op.evaluate());
        }
    }

    @Test
    public void testValidate() throws Exception {

        String[] validQueries = new String[] { "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
                "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }", "ASK { ?s ?p ?o }", "PREFIX test: <http://example.org/test/> INSERT DATA { test:s test:p test:o }",
                "PREFIX test: <http://example.org/test/> SELECT * WHERE { test:s a ?type }",
                "SELECT * WHERE { ?x rdfs:label ?label }" };

        String[] invalidQueries = new String[] { "SELE * WHERE { ?s ?p o }",
                "PREFIX test: <http://example.org/test>\nPREFIX test: <http://example.org/test>\nSELECT * WHERE { test:s a ?type }",
                "SELECT * WHERE { undeclaredPrefix:s a ?type }"

        };

        for (String query : validQueries) {
            SparqlOperationBuilder.create(query).validate();
        }

        for (String query : invalidQueries) {
            try {
                SparqlOperationBuilder.create(query).validate();
                Assert.fail("Expected malformed query exception for " + query);
            } catch (MalformedQueryException e) {
                // expected
            }
        }
    }

}
