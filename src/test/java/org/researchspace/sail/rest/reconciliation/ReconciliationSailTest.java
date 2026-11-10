/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest.reconciliation;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.net.URLDecoder;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.sail.rest.RESTSailConfig;
import org.researchspace.sail.rest.RESTSailTestUtils;

import com.github.tomakehurst.wiremock.junit.WireMockRule;
import com.github.tomakehurst.wiremock.verification.LoggedRequest;

/**
 * Tests for {@link ReconciliationSail} with two service descriptors: the one
 * shipped for the Swiss Art Research RDS, and a made-up one that uses
 * everything a descriptor can say about the request.
 * <p>
 * The stub in reconciliation/mappings has the shape of the responses of
 * https://reconcile.rds.swissartresearch.net/, it is not a recorded response.
 */
public class ReconciliationSailTest {

    private static final String RDS_DESCRIPTOR = "/org/researchspace/apps/default/config/services/rds-reconciliation.ttl";
    private static final String TEST_DESCRIPTOR = "/org/researchspace/sail/rest/reconciliation/test-reconciliation-service.ttl";

    private static final String RDS_PREFIX = "PREFIX rds: <http://www.researchspace.org/resource/system/service/rdsreconciliation/>\n";
    private static final String TEST_PREFIX = "PREFIX t: <http://www.researchspace.org/resource/system/service/testreconciliation/>\n";

    private static final String TWO_RESULTS = "{\"q0\":{\"result\":["
            + "{\"id\":\"Q5593\",\"name\":\"Pablo Picasso\",\"score\":100,\"match\":true},"
            + "{\"id\":\"Q232000\",\"name\":\"Paloma Picasso\",\"score\":60.5,\"match\":false}]}}";

    @Rule
    public WireMockRule wireMockRule = new WireMockRule(
            options().dynamicPort().usingFilesUnderClasspath("org/researchspace/sail/rest/reconciliation"));

    private Repository createRepo(String serviceDescriptorLocation, String path, String httpMethod) throws Exception {
        Model model = Rio.parse(ReconciliationSailTest.class.getResourceAsStream(serviceDescriptorLocation), "",
                RDFFormat.TURTLE);
        IRI rootNode = Models.subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();
        ServiceDescriptor serviceDescriptor = new ServiceDescriptor();
        serviceDescriptor.parse(model, rootNode);

        ReconciliationSailFactory factory = new ReconciliationSailFactory();
        RESTSailConfig sailConfig = (RESTSailConfig) factory.getConfig();
        sailConfig.setHttpMethod(httpMethod);
        RESTSailTestUtils.setServiceUrl(sailConfig, "http://localhost:" + wireMockRule.port() + path);

        ReconciliationSail sail = (ReconciliationSail) factory.getSail(sailConfig);
        sail.setServiceDescriptor(serviceDescriptor);
        return new SailRepository(sail);
    }

    private List<BindingSet> select(Repository repo, String query) {
        try {
            return Repositories.tupleQuery(repo, query, r -> QueryResults.asList(r));
        } finally {
            repo.shutDown();
        }
    }

    private static String messages(Throwable e) {
        StringBuilder sb = new StringBuilder();
        for (Throwable t = e; t != null && t != t.getCause(); t = t.getCause()) {
            sb.append(t.getMessage()).append('\n');
        }
        return sb.toString();
    }

    @Test
    public void testFactory() {
        ReconciliationSailFactory factory = new ReconciliationSailFactory();
        assertEquals("researchspace:ReconciliationSail", factory.getSailType());
        assertEquals("researchspace:ReconciliationSail", factory.getConfig().getType());
    }

    @Test
    public void testRdsDescriptor() throws Exception {
        String query = RDS_PREFIX + "SELECT * WHERE {\n"
                + "  ?subject rds:query \"Picasso\" ;\n"
                + "    rds:type \"Person\" ;\n"
                + "    rds:dataset \"gnd,ulan\" ;\n"
                + "    rds:limit 4 ;\n"
                + "    rds:id ?entity ;\n"
                + "    rds:name ?label ;\n"
                + "    rds:description ?description ;\n"
                + "    rds:entityType ?type ;\n"
                + "    rds:entityDataset ?dataset ;\n"
                + "    rds:score ?score ;\n"
                + "    rds:match ?match ;\n"
                + "    rds:recordId ?recordId ;\n"
                + "    rds:reference ?reference ;\n"
                + "    rds:isReference ?isReference ;\n"
                + "    rds:ordinal ?ordinal .\n"
                + "}";
        List<BindingSet> results = select(createRepo(RDS_DESCRIPTOR, "/", "GET"), query);
        assertEquals(4, results.size());

        BindingSet ulan = results.get(0);
        assertTrue(ulan.getValue("entity") instanceof IRI);
        assertEquals("http://vocab.getty.edu/ulan/500009666", ulan.getValue("entity").stringValue());
        assertEquals("Picasso, Pablo", ulan.getValue("label").stringValue());
        assertEquals("Spanish painter, sculptor, and printmaker, 1881-1973",
                ulan.getValue("description").stringValue());
        assertEquals("Person", ulan.getValue("type").stringValue());
        assertEquals("ulan", ulan.getValue("dataset").stringValue());
        assertEquals("158.10873", ulan.getValue("score").stringValue());
        assertEquals("true", ulan.getValue("match").stringValue());
        assertEquals("500009666", ulan.getValue("recordId").stringValue());
        assertTrue(ulan.getValue("reference") instanceof IRI);
        assertEquals("1", ulan.getValue("isReference").stringValue());
        assertEquals("0", ulan.getValue("ordinal").stringValue());

        // results without a description are returned, just without that binding
        BindingSet gnd = results.get(1);
        assertEquals("https://d-nb.info/gnd/118594206", gnd.getValue("entity").stringValue());
        assertEquals("gnd", gnd.getValue("dataset").stringValue());
        assertFalse(gnd.hasBinding("description"));
        assertEquals("1", gnd.getValue("ordinal").stringValue());

        assertEquals("false", results.get(2).getValue("match").stringValue());
        assertEquals("3", results.get(3).getValue("ordinal").stringValue());
    }

    @Test
    public void testQueryOnlyOverGet() throws Exception {
        wireMockRule.stubFor(get(urlPathEqualTo("/reconcile")).willReturn(
                aResponse().withStatus(200).withHeader("Content-Type", "application/json").withBody(TWO_RESULTS)));

        // curly braces, quotes, spaces, plus, percent and non-ASCII survive the trip
        String text = "{Pablo} \"Ruiz\" + 100% Picassó";
        String query = TEST_PREFIX + "SELECT * WHERE {\n"
                + "  ?subject t:search '" + text + "' ;\n"
                + "    t:id ?id ;\n"
                + "    t:name ?name .\n"
                + "}";
        List<BindingSet> results = select(createRepo(TEST_DESCRIPTOR, "/reconcile", "GET"), query);
        assertEquals(2, results.size());
        assertEquals("Q5593", results.get(0).getValue("id").stringValue());
        assertEquals("Paloma Picasso", results.get(1).getValue("name").stringValue());

        List<LoggedRequest> requests = wireMockRule.findAll(getRequestedFor(urlPathEqualTo("/reconcile")));
        assertEquals(1, requests.size());
        assertFalse(requests.get(0).getUrl().contains("&"));
        // the default value of an input declared in the descriptor is sent as well
        assertEquals(
                "{\"q0\":{\"query\":\"{Pablo} \\\"Ruiz\\\" + 100% Picassó\","
                        + "\"properties\":[{\"pid\":\"lang\",\"v\":\"en\"}]}}",
                requests.get(0).queryParameter("queries").firstValue());
        assertTrue(requests.get(0).getHeader("Accept").contains("application/json"));
    }

    @Test
    public void testAllInputsOverPost() throws Exception {
        wireMockRule.stubFor(post(urlPathEqualTo("/reconcile"))
                .withHeader("Content-Type", containing("application/x-www-form-urlencoded")).willReturn(
                        aResponse().withStatus(200).withHeader("Content-Type", "application/json").withBody(TWO_RESULTS)));

        String query = TEST_PREFIX + "SELECT * WHERE {\n"
                + "  ?subject t:search \"Picasso\" ;\n"
                + "    t:entityType \"Q5\" ;\n"
                + "    t:typeStrict \"should\" ;\n"
                + "    t:maxResults 5 ;\n"
                + "    t:countryOfBirth \"Spain\" ;\n"
                + "    t:placeOfBirth <http://www.wikidata.org/entity/Q8851> ;\n"
                + "    t:born \"1881\" ;\n"
                + "    t:lang \"es\" ;\n"
                + "    t:rowLimit 1 ;\n"
                + "    t:id ?id ;\n"
                + "    t:ordinal ?ordinal .\n"
                + "}";
        List<BindingSet> results = select(createRepo(TEST_DESCRIPTOR, "/reconcile", "POST"), query);
        // capped locally by the ephedra:rowLimit argument
        assertEquals(1, results.size());
        assertEquals("Q5593", results.get(0).getValue("id").stringValue());
        assertEquals("0", results.get(0).getValue("ordinal").stringValue());

        List<LoggedRequest> requests = wireMockRule.findAll(postRequestedFor(urlPathEqualTo("/reconcile")));
        assertEquals(1, requests.size());
        String body = requests.get(0).getBodyAsString();
        assertTrue(body.startsWith("queries="));
        assertFalse(body.contains("&"));
        assertEquals(
                "{\"q0\":{\"query\":\"Picasso\",\"type\":\"Q5\",\"type_strict\":\"should\",\"limit\":5,"
                        + "\"properties\":["
                        + "{\"pid\":\"P19\",\"v\":{\"id\":\"http://www.wikidata.org/entity/Q8851\"}},"
                        + "{\"pid\":\"P19/P17\",\"v\":\"Spain\"},"
                        + "{\"pid\":\"born\",\"v\":\"1881\"},"
                        + "{\"pid\":\"lang\",\"v\":\"es\"}]}}",
                URLDecoder.decode(body.substring("queries=".length()), "UTF-8"));
    }

    @Test
    public void testNoResults() throws Exception {
        wireMockRule.stubFor(get(urlPathEqualTo("/reconcile")).willReturn(aResponse().withStatus(200)
                .withHeader("Content-Type", "application/json").withBody("{\"q0\":{\"result\":[]}}")));

        String query = TEST_PREFIX + "SELECT * WHERE { ?subject t:search \"nobody\" ; t:id ?id . }";
        assertTrue(select(createRepo(TEST_DESCRIPTOR, "/reconcile", "GET"), query).isEmpty());
    }

    @Test
    public void testHttpErrorFailsTheQuery() throws Exception {
        wireMockRule.stubFor(get(urlPathEqualTo("/reconcile")).willReturn(aResponse().withStatus(503)));

        String query = TEST_PREFIX + "SELECT * WHERE { ?subject t:search \"Picasso\" ; t:id ?id . }";
        try {
            select(createRepo(TEST_DESCRIPTOR, "/reconcile", "GET"), query);
            fail("expected the query to fail for HTTP 503 response");
        } catch (Exception e) {
            assertTrue(messages(e).contains("503"));
        }
    }

    @Test
    public void testQueryIsMandatory() throws Exception {
        String query = TEST_PREFIX + "SELECT * WHERE { ?subject t:entityType \"Q5\" ; t:id ?id . }";
        try {
            select(createRepo(TEST_DESCRIPTOR, "/reconcile", "GET"), query);
            fail("expected the query to fail without the text to reconcile");
        } catch (Exception e) {
            // nothing is sent to the service
            assertTrue(wireMockRule.findAll(getRequestedFor(urlPathEqualTo("/reconcile"))).isEmpty());
        }
    }
}
