package org.researchspace.sail.rest;

import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.Assert.assertEquals;

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
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.sparql.SparqlTestUtils;

import com.github.tomakehurst.wiremock.junit.WireMockRule;

public class RESTSailTest {

    @ClassRule
    public static WireMockRule wireMockRule = new WireMockRule(
            options().dynamicPort().usingFilesUnderClasspath("org/researchspace/sail/rest"));

    private static Repository osmRepo;

    @BeforeClass
    public static void setup() throws Exception {
        Model model = Rio.parse(
                RESTSailTest.class.getResourceAsStream(
                        "/org/researchspace/apps/default/config/services/osm-nominatim-search.ttl"),
                "", RDFFormat.TURTLE);
        IRI rootNode = Models.subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();
        ServiceDescriptor serviceDescriptor = new ServiceDescriptor();
        serviceDescriptor.parse(model, rootNode);
        RESTSailConfig sailConfig = new RESTSailConfig();
        // construct service url based on the dynamic port from wiremock
        sailConfig.setUrl("http://localhost:" + wireMockRule.port() + "/search");
        // sailConfig.setUrl("http://localhost:" + "10220" + "/search");

        RESTSailFactory factory = new RESTSailFactory();
        RESTSail sail = (RESTSail) factory.getSail(sailConfig);
        sail.setServiceDescriptor(serviceDescriptor);
        osmRepo = new SailRepository(sail);
    }

    @AfterClass
    public static void teardown() {
        osmRepo.shutDown();
    }

    @Test
    public void testOsmSearch() throws Exception {
        String query = SparqlTestUtils.loadClasspathResourceAsUtf8String(RESTSailTest.class, "osm-bm-query.sq");
        List<BindingSet> results = Repositories.tupleQuery(osmRepo, query, r -> QueryResults.asList(r));
        assertEquals(4, results.size());
        assertEquals(
                "British Museum, Great Russell Street, St Giles, Bloomsbury, London Borough of Camden, London, Greater London, England, WC1B 3DG, United Kingdom",
                results.get(0).getBinding("label").getValue().stringValue());
    }

}
