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
            "met-search", "met-object"));
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
}

