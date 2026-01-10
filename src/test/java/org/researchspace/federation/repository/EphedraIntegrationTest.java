/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.Assert.*;


import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.repository.RepositoryManager;

import org.researchspace.services.storage.file.ClassPathStorage;
import org.researchspace.services.storage.api.PathMapping;

import com.github.tomakehurst.wiremock.junit.WireMockRule;
import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * Integration test for Ephedra federation with REST services.
 */
public class EphedraIntegrationTest extends AbstractIntegrationTest {

    @Rule
    public WireMockRule wireMockRule = new WireMockRule(18089);

    @Inject
    @Rule
    public PlatformStorageRule storageRule;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private Injector injector;



    @Before
    public void setUp() throws Exception {
        // Add ClassPathStorage to PlatformStorage
        ClassPathStorage.Config config = new ClassPathStorage.Config("ephedra");
        ClassPathStorage cpStorage = new ClassPathStorage(new PathMapping.Default(), getClass().getClassLoader(), config);
        storageRule.getPlatformStorage().addStorage("classpath", cpStorage);

        // Re-initialize ServiceRegistry to pick up new descriptors from ClassPathStorage
        injector.getInstance(MpSparqlServiceRegistry.class);

        // Re-initialize Repositories to pick up new configs from ClassPathStorage
        repositoryManager.reinitializeRepositories(java.util.Arrays.asList("service-a", "service-b", "ephedra", "service-old", "ephedra-old"));
    }

    /**
     * Tests a realistic federation scenario involving a join between local data and two remote services (Service A and Service B).
     * <p>
     * Expected behavior:
     * - The query should retrieve data from the local repository (ID).
     * - It should join with Service A to get the name.
     * - It should join with Service B to get the city.
     * - The result should contain both "Alice" and "London".
     */
    @Test
    public void testRealisticFederation() throws Exception {
        // 1. Setup WireMock for Service A and B
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));
                
        stubFor(get(urlPathEqualTo("/service-b"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"city\": \"London\" }")));

        // 2. Add data to default repo
        Repository defaultRepo = repositoryManager.getDefault();
        try (var conn = defaultRepo.getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#hasId"),
                SimpleValueFactory.getInstance().createLiteral("1")
            ));
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Execute Query
        // Join: Local -> Service A -> Service B
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name ?city WHERE { " +
            "  ?person ex:hasId ?id . " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "  SERVICE <http://example.org/ns#ServiceB> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasCity ?city . " +
            "  } " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                var bs = tqr.next();
                assertEquals("Alice", bs.getValue("name").stringValue());
                assertEquals("London", bs.getValue("city").stringValue());
            }
        }
        
        // Verify requests
        verify(getRequestedFor(urlPathEqualTo("/service-a")).withQueryParam("id", equalTo("1")));
        verify(getRequestedFor(urlPathEqualTo("/service-b")).withQueryParam("id", equalTo("1")));
    }

    /**
     * Tests a simple SERVICE query fetching data from a single remote service (Service A) without involving local data.
     * <p>
     * Expected behavior:
     * - The query should send a request to Service A.
     * - The result should contain the name "Alice".
     */
    @Test
    public void testServiceOnly() throws Exception {
        // Setup WireMock
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?name WHERE { " +
            "  BIND(\"1\" AS ?id) " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                assertEquals("Alice", tqr.next().getValue("name").stringValue());
            }
        }
        
        verify(getRequestedFor(urlPathEqualTo("/service-a")).withQueryParam("id", equalTo("1")));
    }

    /**
     * Tests a query against the local repository only, ensuring that the federation wrapper doesn't interfere with local queries.
     * <p>
     * Expected behavior:
     * - The query should retrieve the ID "1" from the local repository.
     */
    @Test
    public void testLocalOnly() throws Exception {
        Repository defaultRepo = repositoryManager.getDefault();
        try (var conn = defaultRepo.getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#hasId"),
                SimpleValueFactory.getInstance().createLiteral("1")
            ));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?id WHERE { " +
            "  ?person ex:hasId ?id . " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                assertEquals("1", tqr.next().getValue("id").stringValue());
            }
        }
    }

    /**
     * Tests a join between local data and a single remote service (Service A).
     * <p>
     * Expected behavior:
     * - The query should retrieve the ID from the local repository.
     * - It should join with Service A using the ID to get the name.
     * - The result should contain "Alice".
     */
    @Test
    public void testLocalAndService() throws Exception {
        // Setup WireMock
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));

        Repository defaultRepo = repositoryManager.getDefault();
        try (var conn = defaultRepo.getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#hasId"),
                SimpleValueFactory.getInstance().createLiteral("1")
            ));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name WHERE { " +
            "  ?person ex:hasId ?id . " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                assertEquals("Alice", tqr.next().getValue("name").stringValue());
            }
        }
        
        verify(getRequestedFor(urlPathEqualTo("/service-a")).withQueryParam("id", equalTo("1")));
    }
    /**
     * Tests the `ephedra:executeLast` hint, which instructs the federation engine to execute the SERVICE clause last.
     * <p>
     * Expected behavior:
     * - The query should execute successfully.
     * - The result should contain "Alice".
     */
    @Test
    public void testExecuteLast() throws Exception {
        // Setup WireMock
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        
        // Query with executeLast hint
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name WHERE { " +
            "  BIND(\"1\" AS ?id) " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ephedra:Prior ephedra:executeLast \"true\"^^xsd:boolean . " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                assertEquals("Alice", tqr.next().getValue("name").stringValue());
            }
        }
        
        verify(getRequestedFor(urlPathEqualTo("/service-a")).withQueryParam("id", equalTo("1")));
    }

    /**
     * Tests backward compatibility with old configuration formats ("service-old" and "ephedra-old").
     * <p>
     * Expected behavior:
     * - The "ephedra-old" repository should be initialized.
     * - The query should successfully retrieve data from "ServiceOld".
     * - The result should contain "OldConfig".
     */
    @Test
    public void testOldConfig() throws Exception {

        // 5. Setup WireMock
        stubFor(get(urlPathEqualTo("/service-old"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"OldConfig\" }")));

        // 6. Query
        Repository ephedraRepo = repositoryManager.getRepository("ephedra-old");
        assertNotNull("Ephedra Old repository should be initialized", ephedraRepo);
        
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?name WHERE { " +
            "  SERVICE <http://www.researchspace.org/resource/system/repository#ServiceOld> { " +
            "    [] ex:hasName ?name . " +
            "  } " +
            "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                assertEquals("OldConfig", tqr.next().getValue("name").stringValue());
            }
        }
    }
}
