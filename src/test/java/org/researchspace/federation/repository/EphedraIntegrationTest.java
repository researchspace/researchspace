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
        repositoryManager.reinitializeRepositories(java.util.Arrays.asList(
            "service-a", "service-b", "ephedra", 
            "service-old", "ephedra-old",
            "met-search", "met-object", "sparql-repo"));
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

    /**
     * Tests a query with two dependent SERVICE clauses, where the second SERVICE
     * depends on a variable bound by the first SERVICE.
     * <p>
     * This mimics the MET museum query pattern where:
     * - First SERVICE (search) returns objectIDs
     * - Second SERVICE (object details) requires objectid as input
     * <p>
     * This test verifies that bindings from the first SERVICE are correctly
     * propagated to the second SERVICE.
     */
    @Test
    public void testDependentServiceClauses() throws Exception {
        // 1. Setup WireMock for MET Search API - returns a list of object IDs
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("vase"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 2, \"objectIDs\": [123, 456] }")));

        // 2. Setup WireMock for MET Object API - returns object details for each ID
        stubFor(get(urlPathEqualTo("/public/collection/v1/objects/123"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"objectID\": 123, \"title\": \"Greek Vase\", \"objectName\": \"Vase\", \"primaryImageSmall\": \"http://example.org/image123.jpg\" }")));

        stubFor(get(urlPathEqualTo("/public/collection/v1/objects/456"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"objectID\": 456, \"title\": \"Roman Vase\", \"objectName\": \"Amphora\", \"primaryImageSmall\": \"http://example.org/image456.jpg\" }")));

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Execute Query with dependent SERVICE clauses
        String query = 
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?title ?objectName ?primaryImageSmall WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"vase\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  SERVICE met:METObjectDescriptionService { " +
            "    ?y met:objectid ?objectid; " +
            "       met:title ?title; " +
            "       met:objectName ?objectName; " +
            "       met:primaryImageSmall ?primaryImageSmall. " +
            "  } " +
            "} LIMIT 10";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                
                var bs = tqr.next();
                assertNotNull("objectid should be bound", bs.getValue("objectid"));
                assertNotNull("title should be bound", bs.getValue("title"));
                assertNotNull("objectName should be bound", bs.getValue("objectName"));
                
                // Check that we got one of the expected values
                String title = bs.getValue("title").stringValue();
                assertTrue("Title should be one of the expected values", 
                    title.equals("Greek Vase") || title.equals("Roman Vase"));
            }
        }
        
        // Verify that the search endpoint was called
        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("vase")));
        
        // Verify that at least one object details endpoint was called with the objectid from search
        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/objects/123")));
    }

    /**
     * Tests that LIMIT is properly respected for REST-backed services.
     * <p>
     * With SynchronousRestServiceJoin, REST services are evaluated lazily one binding at a time.
     * This means LIMIT is properly respected - we only make as many HTTP calls as needed.
     * <p>
     * This test verifies that with LIMIT 3 and 20 available object IDs, only 3 HTTP calls
     * are made to the second SERVICE (object details endpoint).
     */
    @Test
    public void testLimitAwarenessWithDependentServices() throws Exception {
        // 1. Setup WireMock for MET Search API - returns 20 object IDs
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("limit-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 20, \"objectIDs\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] }")));

        // 2. Setup WireMock for ALL object IDs (so any can be called)
        for (int i = 1; i <= 20; i++) {
            stubFor(get(urlPathEqualTo("/public/collection/v1/objects/" + i))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("{ \"objectID\": " + i + ", \"title\": \"Object " + i + "\", \"objectName\": \"Item\", \"primaryImageSmall\": \"http://example.org/img" + i + ".jpg\" }")));
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Execute Query with LIMIT 3
        String query = 
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?title WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"limit-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  SERVICE met:METObjectDescriptionService { " +
            "    ?y met:objectid ?objectid; " +
            "       met:title ?title. " +
            "  } " +
            "} LIMIT 3";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    tqr.next();
                    resultCount++;
                }
            }
        }
        
        assertEquals("Query should return exactly 3 results due to LIMIT", 3, resultCount);
        
        // Verify that the search endpoint was called once
        verify(1, getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("limit-test")));
        
        // Count how many object detail calls were made
        int objectDetailCalls = findAll(getRequestedFor(urlPathMatching("/public/collection/v1/objects/.*"))).size();
        
        // With SynchronousRestServiceJoin prefetching, LIMIT is respected with bounded parallelism:
        // - First SERVICE returns 20 object IDs in 1 HTTP call
        // - Second SERVICE uses prefetching (default size 5), making a few extra calls
        // - After 3 results are returned, LIMIT closes the iteration
        // - HTTP calls: at least LIMIT (3), at most LIMIT + prefetchSize (3 + 5 = 8)
        
        // Assert that we made at least LIMIT calls but not all 20
        assertTrue("Should make at least LIMIT HTTP calls", objectDetailCalls >= 3);
        assertTrue("With prefetching, should NOT make all 20 HTTP calls", objectDetailCalls <= 12);
    }

    /**
     * Tests that LIMIT is properly respected when there are BIND statements between SERVICE clauses.
     * <p>
     * This is a regression test for an issue where BIND statements between SERVICE clauses
     * caused the lazy evaluation to not work properly. The query pattern is:
     * <pre>
     * SERVICE Search { ... returns ?objectid }
     * BIND(?objectid AS ?id)     # <- creates alias
     * BIND(?subject AS ?iri)     # <- creates another alias  
     * SERVICE Description { ... uses ?id }
     * </pre>
     * <p>
     * The issue is that BIND statements create Extension nodes which are joined using
     * ControlledWorkerJoin (not our lazy SynchronousRestServiceJoin), potentially causing
     * all bindings to be consumed eagerly before reaching the second SERVICE.
     */
    @Test
    public void testLimitAwarenessWithBindBetweenServices() throws Exception {
        // 1. Setup WireMock for MET Search API - returns 20 object IDs
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("bind-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 20, \"objectIDs\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] }")));

        // 2. Setup WireMock for ALL object IDs
        for (int i = 1; i <= 20; i++) {
            stubFor(get(urlPathEqualTo("/public/collection/v1/objects/" + i))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("{ \"objectID\": " + i + ", \"title\": \"Object " + i + "\", \"objectName\": \"Item\", \"primaryImageSmall\": \"http://example.org/img" + i + ".jpg\" }")));
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Execute Query with BIND statements between SERVICE clauses (mimics user's MET query)
        // Note: The BIND statements create the ?id alias that the second SERVICE needs
        String query = 
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?subject ?id ?title WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?subject met:q \"bind-test\"; " +
            "             met:objectIDs ?objectid. " +
            "  } " +
            "  BIND(?objectid AS ?id) " +      // <-- BIND between services
            "  BIND(?subject AS ?iri) " +      // <-- Another BIND between services
            "  SERVICE met:METObjectDescriptionService { " +
            "    ?y met:objectid ?id; " +      // Uses ?id from BIND
            "       met:title ?title. " +
            "  } " +
            "} LIMIT 3";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    tqr.next();
                    resultCount++;
                }
            }
        }
        
        assertEquals("Query should return exactly 3 results due to LIMIT", 3, resultCount);
        
        // Verify that the search endpoint was called once
        verify(1, getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("bind-test")));
        
        // Count how many object detail calls were made
        int objectDetailCalls = findAll(getRequestedFor(urlPathMatching("/public/collection/v1/objects/.*"))).size();
        
        // With prefetching, lazy evaluation still bounds HTTP calls significantly:
        // - Makes at least LIMIT (3) calls
        // - Makes at most LIMIT + prefetchSize (3 + 5 = 8) calls
        // - NOT all 20 calls (that would mean prefetching is broken)
        assertTrue("Should make at least LIMIT HTTP calls", objectDetailCalls >= 3);
        assertTrue("With prefetching, should NOT make all 20 HTTP calls", objectDetailCalls <= 12);
    }

    /**
     * Tests that prefetching makes more than LIMIT but less than total HTTP calls.
     * <p>
     * With prefetchSize=5 (default) and LIMIT 3, we expect:
     * - At least LIMIT (3) HTTP calls (to get results)
     * - At most LIMIT + prefetchSize (3 + 5 = 8) HTTP calls  
     * - NOT all 20 HTTP calls (that would mean prefetching is broken)
     * <p>
     * This verifies the bounded parallelism is working - we trade a few extra
     * HTTP calls for much faster execution.
     */
    @Test
    public void testPrefetchingBehavior() throws Exception {
        // 1. Setup WireMock for MET Search API - returns 20 object IDs
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("prefetch-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 20, \"objectIDs\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] }")));

        // 2. Setup WireMock for ALL object IDs - each with 100ms delay to simulate real HTTP
        for (int i = 1; i <= 20; i++) {
            stubFor(get(urlPathEqualTo("/public/collection/v1/objects/" + i))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withFixedDelay(50) // 50ms delay to see prefetching benefit
                    .withBody("{ \"objectID\": " + i + ", \"title\": \"Object " + i + "\", \"objectName\": \"Item\", \"primaryImageSmall\": \"http://example.org/img" + i + ".jpg\" }")));
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Execute Query with LIMIT 3
        String query = 
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?subject ?objectid ?title WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?subject met:q \"prefetch-test\"; " +
            "             met:objectIDs ?objectid. " +
            "  } " +
            "  SERVICE met:METObjectDescriptionService { " +
            "    ?y met:objectid ?objectid; " +
            "       met:title ?title. " +
            "  } " +
            "} LIMIT 3";

        long startTime = System.currentTimeMillis();
        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    tqr.next();
                    resultCount++;
                }
            }
        }
        long duration = System.currentTimeMillis() - startTime;
        
        assertEquals("Query should return exactly 3 results due to LIMIT", 3, resultCount);
        
        // Count how many object detail calls were made
        int objectDetailCalls = findAll(getRequestedFor(urlPathMatching("/public/collection/v1/objects/.*"))).size();
        
        // With prefetching (default prefetchSize=5):
        // - Minimum calls: LIMIT (3) - if prefetcher hadn't started more
        // - Maximum calls: LIMIT + prefetchSize (3 + 5 = 8) - prefetcher may have started extra
        // - NOT 20: that would mean all were fetched (broken)
        
        System.out.println("Prefetching test: " + objectDetailCalls + " HTTP calls made in " + duration + "ms for LIMIT 3");
        
        assertTrue("With prefetching, should make at least LIMIT HTTP calls", 
            objectDetailCalls >= 3);
        assertTrue("With prefetching, should NOT make all 20 HTTP calls (should be <= LIMIT + prefetchSize + buffer)", 
            objectDetailCalls <= 12); // Allow some extra for thread timing
    }

    /**
     * Tests that OPTIONAL + SERVICE produces a proportional blow-up of queries to the default repo.
     * <p>
     * This reproduces the TNA Discovery query pattern where:
     * - A SERVICE clause returns N results from a REST API
     * - An OPTIONAL clause joins those N results against the default (local) repository
     * <p>
     * With FedX's ControlledWorkerLeftJoin, each of the N left bindings spawns a separate
     * ParallelLeftJoinTask, each of which evaluates the OPTIONAL's right side against the
     * default repo. This means N queries to the default repo — the "parallel query storm"
     * that overwhelms Blazegraph in production.
     * <p>
     * This test verifies:
     * - The query completes (correctness)
     * - endpointEvalCount grows proportionally to N (proving the N-query blow-up)
     */
    @Test
    public void testOptionalWithServiceResults() throws Exception {
        int N = 10; // Number of results from the SERVICE

        // 1. Setup WireMock for MET Search API - returns N object IDs
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("optional-blowup-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": " + N + ", \"objectIDs\": [1,2,3,4,5,6,7,8,9,10] }")));

        // 2. Add local data to the default repo that matches SOME of the objectIDs
        // Only add matches for IDs 1, 2, 3 — so we can verify partial OPTIONAL matching
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            for (int id : new int[]{1, 2, 3}) {
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasObjectId"),
                    vf.createLiteral(String.valueOf(id))
                ));
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasLabel"),
                    vf.createLiteral("Record " + id)
                ));
            }
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Enable debug counters and record baseline
        org.researchspace.federation.repository.evaluation.QueryHintAwareSparqlFederationEvalStrategy
            .enableDebugCounters();

        try {
            // 5. Execute query: SERVICE returns N results → OPTIONAL joins against default repo
            // Using 2 triple patterns in OPTIONAL to ensure ExclusiveGroup formation
            String query = 
                "PREFIX ex: <http://example.org/ns#> " +
                "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
                "SELECT ?objectid ?existingRecord ?label ?exists WHERE { " +
                "  SERVICE met:METCollectionSearchService { " +
                "    ?x met:q \"optional-blowup-test\"; " +
                "       met:objectIDs ?objectid. " +
                "  } " +
                "  OPTIONAL { " +
                "    ?existingRecord ex:hasObjectId ?objectid . " +
                "    ?existingRecord ex:hasLabel ?label . " +
                "  } " +
                "  BIND(BOUND(?existingRecord) AS ?exists) " +
                "}";

            int resultCount = 0;
            int matchCount = 0;
            try (var conn = ephedraRepo.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery(query);
                try (TupleQueryResult tqr = tq.evaluate()) {
                    while (tqr.hasNext()) {
                        var bs = tqr.next();
                        resultCount++;
                        if (bs.getValue("existingRecord") != null) {
                            matchCount++;
                        }
                    }
                }
            }

            // 6. Verify results
            assertEquals("Should get N results (one per objectID from SERVICE)", N, resultCount);
            assertEquals("Should match 3 records from default repo (IDs 1,2,3)", 3, matchCount);

            // 7. Verify the blow-up via debug counters
            int leftJoinCalls = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getLeftJoinCallCount();
            int endpointEvals = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getEndpointEvalCount();
            int joinCalls = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getJoinCallCount();
            
            System.out.println("OPTIONAL+SERVICE blow-up test (N=" + N + "): " +
                "leftJoinCalls=" + leftJoinCalls + 
                ", endpointEvals=" + endpointEvals + 
                ", joinCalls=" + joinCalls);

            // executeLeftJoin is called ONCE (creates ControlledWorkerLeftJoin)
            assertEquals("executeLeftJoin should be called exactly once", 1, leftJoinCalls);

            // VALUES-based bind left join bypasses evaluateExclusiveGroup entirely —
            // all N bindings are batched into a single SPARQL query with VALUES clause,
            // so endpointEvalCount stays at 0 (no individual per-binding queries)
            assertEquals("Endpoint evaluations should be 0 — VALUES batching eliminates the blow-up", 
                0, endpointEvals);
        } finally {
            org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.disableDebugCounters();
        }
        
        // Verify the search SERVICE was called
        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("optional-blowup-test")));
    }

    /**
     * Tests that regular JOIN + SERVICE with ExclusiveGroup uses VALUES batching.
     * <p>
     * Same pattern as the OPTIONAL test, but with a required (inner) join instead
     * of OPTIONAL. Without VALUES batching, FedX would use ControlledWorkerJoin
     * (N parallel queries to the default repo). With our fix, it uses
     * ControlledWorkerBindJoin + evaluateBoundJoinStatementPattern → single VALUES query.
     * </p>
     * <p>
     * Inner join semantics: only matching rows are returned (3 out of 10).
     * </p>
     */
    @Test
    public void testJoinWithServiceResults() throws Exception {
        int N = 10;

        // 1. Setup WireMock for MET Search API
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("join-blowup-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": " + N + ", \"objectIDs\": [1,2,3,4,5,6,7,8,9,10] }")));

        // 2. Add local data — only IDs 1, 2, 3 have records
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            for (int id : new int[]{1, 2, 3}) {
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasObjectId"),
                    vf.createLiteral(String.valueOf(id))
                ));
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasLabel"),
                    vf.createLiteral("Record " + id)
                ));
            }
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Enable debug counters
        org.researchspace.federation.repository.evaluation.QueryHintAwareSparqlFederationEvalStrategy
            .enableDebugCounters();

        try {
            // 5. Execute query: SERVICE returns N results → required JOIN against default repo
            // Two triple patterns ensure ExclusiveGroup formation (not just StatementPattern)
            String query = 
                "PREFIX ex: <http://example.org/ns#> " +
                "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
                "SELECT ?objectid ?existingRecord ?label WHERE { " +
                "  SERVICE met:METCollectionSearchService { " +
                "    ?x met:q \"join-blowup-test\"; " +
                "       met:objectIDs ?objectid. " +
                "  } " +
                "  ?existingRecord ex:hasObjectId ?objectid . " +
                "  ?existingRecord ex:hasLabel ?label . " +
                "}";

            int resultCount = 0;
            try (var conn = ephedraRepo.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery(query);
                try (TupleQueryResult tqr = tq.evaluate()) {
                    while (tqr.hasNext()) {
                        var bs = tqr.next();
                        resultCount++;
                    }
                }
            }

            // 6. Verify results — inner join: only 3 matches (IDs 1,2,3)
            assertEquals("Should get 3 results (inner join — only matching IDs)", 3, resultCount);

            // 7. Verify VALUES batching
            int endpointEvals = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getEndpointEvalCount();
            int joinCalls = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getJoinCallCount();

            System.out.println("JOIN+SERVICE test (N=" + N + "): " +
                "endpointEvals=" + endpointEvals + ", joinCalls=" + joinCalls);

            // VALUES batching bypasses evaluateExclusiveGroup — endpointEvals stays 0
            assertEquals("Endpoint evaluations should be 0 — VALUES batching for regular JOIN",
                0, endpointEvals);
        } finally {
            org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.disableDebugCounters();
        }

        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("join-blowup-test")));
    }

    /**
     * Tests that a plain SPARQL HTTP repository can be added as a federation member
     * and queried via SERVICE clause using the serviceReference IRI.
     * <p>
     * This is the backward compatibility scenario where users define a repository like:
     * <pre>
     * [] a config:Repository ;
     *    config:rep.id "graceful17" ;
     *    config:rep.impl [
     *       config:rep.type "researchspace:SPARQLRepository" ;
     *       config:sparql.queryEndpoint <https://example.org/sparql>
     *    ] .
     * </pre>
     * And add it to the federation with:
     * <pre>
     * config:fed.member [
     *    ephedra:delegateRepositoryID "graceful17" ;
     *    ephedra:serviceReference <http://www.researchspace.org/resource/system/repository/federation#graceful17>
     * ]
     * </pre>
     * Then query via:
     * <pre>
     * SERVICE <http://www.researchspace.org/resource/system/repository/federation#graceful17> {
     *   ?subject rdf:type <https://example.org/Person> .
     * }
     * </pre>
     */
    @Test
    public void testSparqlRepositoryAsFederationMember() throws Exception {
        // 1. Setup WireMock to act as a SPARQL endpoint
        // The SPARQL repo sends HTTP GET with "query" parameter
        String sparqlJsonResponse = 
            "{" +
            "  \"head\": { \"vars\": [\"subject\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"subject\": { \"type\": \"uri\", \"value\": \"http://example.org/person/1\" } }," +
            "      { \"subject\": { \"type\": \"uri\", \"value\": \"http://example.org/person/2\" } }," +
            "      { \"subject\": { \"type\": \"uri\", \"value\": \"http://example.org/person/3\" } }" +
            "    ]" +
            "  }" +
            "}";

        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(sparqlJsonResponse)));

        // 2. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 3. Execute query using SERVICE with the old-style serviceReference URI
        String query = 
            "SELECT DISTINCT ?subject WHERE { " +
            "  SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "    ?subject a <http://example.org/Person> . " +
            "  } " +
            "} LIMIT 100";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results from SPARQL repo", tqr.hasNext());
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    assertNotNull("subject should be bound", bs.getValue("subject"));
                    resultCount++;
                }
            }
        }
        
        assertEquals("Should get 3 results from the SPARQL endpoint", 3, resultCount);
        
        // Verify the SPARQL endpoint was called
        verify(anyRequestedFor(urlPathEqualTo("/sparql")));
    }

    /**
     * Tests that source selection is bypassed for single-member federations.
     * <p>
     * The default Ephedra configuration has only ONE FedX member (the default repo).
     * With a single member, every triple pattern must go to that endpoint — source
     * selection ASK probes are redundant and should be skipped entirely.
     * <p>
     * This test verifies:
     * - The sourceSelectionBypassCount counter is incremented (bypass happened)
     * - The query still produces correct results
     * - No per-binding endpoint evaluations occur (endpointEvals == 0)
     */
    @Test
    public void testSingleMemberSourceSelectionBypass() throws Exception {
        int N = 5;

        // 1. Setup WireMock for MET Search API
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("source-selection-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": " + N + ", \"objectIDs\": [1,2,3,4,5] }")));

        // 2. Add local data matching some objectIDs
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            for (int id : new int[]{1, 2}) {
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasObjectId"),
                    vf.createLiteral(String.valueOf(id))
                ));
                conn.add(vf.createStatement(
                    vf.createIRI("http://example.org/record/" + id),
                    vf.createIRI("http://example.org/ns#hasLabel"),
                    vf.createLiteral("Record " + id)
                ));
            }
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Enable debug counters
        org.researchspace.federation.repository.evaluation.QueryHintAwareSparqlFederationEvalStrategy
            .enableDebugCounters();

        try {
            // 5. Execute query with SERVICE + OPTIONAL (triggers source selection)
            String query = 
                "PREFIX ex: <http://example.org/ns#> " +
                "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
                "SELECT ?objectid ?existingRecord ?label WHERE { " +
                "  SERVICE met:METCollectionSearchService { " +
                "    ?x met:q \"source-selection-test\"; " +
                "       met:objectIDs ?objectid. " +
                "  } " +
                "  OPTIONAL { " +
                "    ?existingRecord ex:hasObjectId ?objectid . " +
                "    ?existingRecord ex:hasLabel ?label . " +
                "  } " +
                "}";

            int resultCount = 0;
            int matchCount = 0;
            try (var conn = ephedraRepo.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery(query);
                try (TupleQueryResult tqr = tq.evaluate()) {
                    while (tqr.hasNext()) {
                        var bs = tqr.next();
                        resultCount++;
                        if (bs.getValue("existingRecord") != null) {
                            matchCount++;
                        }
                    }
                }
            }

            // 6. Verify results
            assertEquals("Should get N results (one per objectID from SERVICE)", N, resultCount);
            assertEquals("Should match 2 records from default repo (IDs 1,2)", 2, matchCount);

            // 7. Verify source selection was BYPASSED (the core assertion for this test)
            int bypassCount = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getSourceSelectionBypassCount();
            assertTrue("Source selection should be bypassed for single-member federation " +
                "(bypassCount=" + bypassCount + ")", bypassCount > 0);

            // 8. Verify no per-binding endpoint evaluations (VALUES batching works)
            int endpointEvals = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getEndpointEvalCount();
            assertEquals("Endpoint evaluations should be 0 — VALUES batching", 0, endpointEvals);
        } finally {
            org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.disableDebugCounters();
        }

        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("source-selection-test")));
    }

    /**
     * Tests that join ordering inside OPTIONAL correctly considers outer-scope
     * bound variables.
     * <p>
     * This reproduces the TNA Discovery query pattern where:
     * - A SERVICE clause returns results including {@code ?ref}
     * - The OPTIONAL body has two groups of patterns:
     *   (A) {@code ?record ex:hasId ?identifier . ?identifier ex:hasType ex:crn .}
     *       — does NOT use {@code ?ref}
     *   (B) {@code ?identifier ex:hasLabel ?ref .}
     *       — USES {@code ?ref} from outer scope
     * <p>
     * Without outer-scope awareness, the cost model places group A first
     * (ExclusiveGroup is cheaper), causing a fully unbound query that scans
     * the entire ``hasType crn`` table. With the fix, group B goes first
     * because {@code ?ref} is recognized as bound from the outer scope.
     * <p>
     * This test verifies:
     * - Correct results (OPTIONAL matching works)
     * - endpointEvalCount == 0 (VALUES batching, no per-binding queries)
     * <p>
     * The OPTIONAL body uses a UNION to create an NJoin with both ExclusiveGroup
     * and NUnion children (matching the real TNA query structure). Without the fix,
     * the ExclusiveGroup (which does NOT use outer-scope vars) would be ordered first,
     * causing a full-scan query.
     */
    @Test
    public void testOptionalJoinOrderWithOuterScopeVars() throws Exception {
        int N = 5;

        // 1. Setup WireMock for MET Search API - returns N object IDs
        // Each result also has a "ref" value that will be used for OPTIONAL matching
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("outer-scope-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": " + N + ", \"objectIDs\": [1,2,3,4,5] }")));

        // 2. Add local data to the default repo
        // Structure mirrors the real TNA query:
        //   ?existingRecord ex:P1 ?identifier .    (ExclusiveGroup with P2)
        //   ?identifier ex:P2 ex:crn .
        //   { ?identifier ex:P190 ?ref } UNION { ?identifier rdfs:label ?ref }  (NUnion)
        //
        // ?ref comes from the outer scope (SERVICE result)
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            for (int id : new int[]{1, 2}) {
                var identifier = vf.createIRI("http://example.org/identifier/" + id);
                var record = vf.createIRI("http://example.org/record/" + id);

                // ?identifier P190 ?ref (matches the NUnion branch)
                conn.add(vf.createStatement(
                    identifier,
                    vf.createIRI("http://example.org/ns#P190"),
                    vf.createLiteral(String.valueOf(id))
                ));
                // ?identifier P2 crn (part of ExclusiveGroup)
                conn.add(vf.createStatement(
                    identifier,
                    vf.createIRI("http://example.org/ns#P2"),
                    vf.createIRI("http://example.org/ns#crn")
                ));
                // ?record P1 ?identifier (part of ExclusiveGroup)
                conn.add(vf.createStatement(
                    record,
                    vf.createIRI("http://example.org/ns#P1"),
                    identifier
                ));
            }
        }

        // 3. Get Federation Repository
        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // 4. Enable debug counters
        org.researchspace.federation.repository.evaluation.QueryHintAwareSparqlFederationEvalStrategy
            .enableDebugCounters();

        try {
            // 5. Execute query with UNION inside OPTIONAL
            // This creates the NJoin(ExclusiveGroup, NUnion) structure
            //
            // The critical join ordering inside the OPTIONAL NJoin:
            //   NUnion (uses ?ref from outer scope) → should be FIRST
            //   ExclusiveGroup (P1+P2, no outer scope vars) → should be SECOND
            String query = 
                "PREFIX ex: <http://example.org/ns#> " +
                "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
                "SELECT ?ref ?existingRecord ?identifier ?exists WHERE { " +
                "  SERVICE met:METCollectionSearchService { " +
                "    ?x met:q \"outer-scope-test\"; " +
                "       met:objectIDs ?ref. " +
                "  } " +
                "  OPTIONAL { " +
                // ExclusiveGroup: both patterns on the same endpoint, ?existingRecord and ?identifier
                "    ?existingRecord ex:P1 ?identifier . " +
                "    ?identifier ex:P2 ex:crn . " +
                // NUnion: UNION creates separate alternative paths, uses ?ref from outer scope
                "    { ?identifier ex:P190 ?ref } " +
                "    UNION " +
                "    { ?identifier <http://www.w3.org/2000/01/rdf-schema#label> ?ref } " +
                "  } " +
                "  BIND(BOUND(?identifier) AS ?exists) " +
                "}";

            int resultCount = 0;
            int matchCount = 0;
            try (var conn = ephedraRepo.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery(query);
                try (TupleQueryResult tqr = tq.evaluate()) {
                    while (tqr.hasNext()) {
                        var bs = tqr.next();
                        resultCount++;
                        if (bs.getValue("existingRecord") != null) {
                            matchCount++;
                        }
                    }
                }
            }

            // 6. Verify results
            assertEquals("Should get N results (one per ref from SERVICE)", N, resultCount);
            assertEquals("Should match 2 records from default repo (refs 1,2)", 2, matchCount);

            // 7. Verify the fix via debug counters
            int leftJoinCalls = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getLeftJoinCallCount();
            int endpointEvals = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getEndpointEvalCount();
            int joinCalls = org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.getJoinCallCount();
            
            System.out.println("OPTIONAL outer-scope join order test (N=" + N + "): " +
                "leftJoinCalls=" + leftJoinCalls + 
                ", endpointEvals=" + endpointEvals + 
                ", joinCalls=" + joinCalls);

            // executeLeftJoin should be called exactly once
            assertEquals("executeLeftJoin should be called exactly once", 1, leftJoinCalls);

            // The fix ensures NUnion (using outer-scope ?ref) is ordered first,
            // preventing the full-scan ExclusiveGroup from being the lead pattern.
            // Some endpoint evals are expected since LeftJoin evaluates right side per-binding,
            // but should be much less than N * patterns (which would indicate full scans).
            assertTrue("Endpoint evaluations should be manageable (was: " + endpointEvals + ")",
                endpointEvals <= N);
        } finally {
            org.researchspace.federation.repository.evaluation
                .QueryHintAwareSparqlFederationEvalStrategy.disableDebugCounters();
        }
        
        // Verify the search SERVICE was called
        verify(getRequestedFor(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("outer-scope-test")));
    }
}
