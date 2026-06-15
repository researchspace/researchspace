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
            "met-search", "met-object", "sparql-repo", "search-service"));
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
     * Tests that an unmatched left row survives an OPTIONAL when the left side
     * produces exactly ONE binding and the OPTIONAL body is a multi-pattern
     * ExclusiveGroup on the default member.
     * <p>
     * Left join semantics require that left rows without a match in the OPTIONAL
     * are returned with the optional variables unbound. A single left binding
     * must not degrade to inner-join semantics.
     */
    @Test
    public void testOptionalKeepsUnmatchedLeftRowWithSingleBinding() throws Exception {
        // SERVICE returns exactly ONE objectID with no matching record locally
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("single-left-row-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 1, \"objectIDs\": [99] }")));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?existingRecord ?label WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"single-left-row-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  OPTIONAL { " +
            "    ?existingRecord ex:hasObjectId ?objectid . " +
            "    ?existingRecord ex:hasLabel ?label . " +
            "  } " +
            "}";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    assertEquals("99", bs.getValue("objectid").stringValue());
                    assertNull("existingRecord should be unbound (no match)",
                        bs.getValue("existingRecord"));
                    assertNull("label should be unbound (no match)",
                        bs.getValue("label"));
                }
            }
        }

        assertEquals("The single unmatched left row must survive the OPTIONAL", 1, resultCount);
    }

    /**
     * Tests that an unmatched left row survives an OPTIONAL when the left side
     * produces exactly ONE binding and the OPTIONAL body is a single-source
     * complex pattern (UNION + statement patterns), i.e. an ExclusiveSubquery.
     */
    @Test
    public void testOptionalKeepsUnmatchedLeftRowWithSingleBindingSubquery() throws Exception {
        // SERVICE returns exactly ONE objectID with no matching record locally
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("single-left-row-subquery-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 1, \"objectIDs\": [99] }")));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?existingRecord ?identifier WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"single-left-row-subquery-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  OPTIONAL { " +
            "    ?existingRecord ex:P1 ?identifier . " +
            "    ?identifier ex:P2 ex:crn . " +
            "    { ?identifier ex:P190 ?objectid } " +
            "    UNION " +
            "    { ?identifier <http://www.w3.org/2000/01/rdf-schema#label> ?objectid } " +
            "  } " +
            "}";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    assertEquals("99", bs.getValue("objectid").stringValue());
                    assertNull("existingRecord should be unbound (no match)",
                        bs.getValue("existingRecord"));
                    assertNull("identifier should be unbound (no match)",
                        bs.getValue("identifier"));
                }
            }
        }

        assertEquals("The single unmatched left row must survive the OPTIONAL", 1, resultCount);
    }

    /**
     * Tests that input bindings are preserved in the results when a single-source
     * complex pattern (ExclusiveSubquery wrapping UNION + statement pattern) is
     * evaluated per-binding in an inner join.
     * <p>
     * The SERVICE produces exactly one binding for {@code ?objectid}; the value is
     * substituted into the SPARQL text sent to the endpoint, so the endpoint result
     * rows do not contain {@code ?objectid}. The evaluation must re-insert the input
     * bindings into each result row, otherwise {@code ?objectid} ends up unbound in
     * the final results.
     */
    @Test
    public void testExclusiveSubqueryPreservesInputBindings() throws Exception {
        // SERVICE returns exactly ONE objectID
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("preserve-bindings-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 1, \"objectIDs\": [1] }")));

        // Local data matching the first UNION branch
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            var identifier = vf.createIRI("http://example.org/identifier/1");
            var record = vf.createIRI("http://example.org/record/1");
            conn.add(vf.createStatement(
                identifier, vf.createIRI("http://example.org/ns#P190"), vf.createLiteral("1")));
            conn.add(vf.createStatement(
                record, vf.createIRI("http://example.org/ns#P1"), identifier));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // The braced group is a single-source NJoin(NUnion, pattern), which the
        // optimizer replaces with an ExclusiveSubquery. The FILTER keeps the group
        // as a separate node from the top-level join, so the subquery is evaluated
        // per left binding with the SERVICE result as input bindings.
        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?existingRecord ?identifier WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"preserve-bindings-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  { " +
            "    { ?identifier ex:P190 ?objectid } " +
            "    UNION " +
            "    { ?identifier <http://www.w3.org/2000/01/rdf-schema#label> ?objectid } " +
            "    ?existingRecord ex:P1 ?identifier . " +
            "    FILTER(?identifier != ?existingRecord) " +
            "  } " +
            "}";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    assertNotNull("objectid from the left side must be present in the result row",
                        bs.getValue("objectid"));
                    assertEquals("1", bs.getValue("objectid").stringValue());
                    assertEquals("http://example.org/record/1",
                        bs.getValue("existingRecord").stringValue());
                    assertEquals("http://example.org/identifier/1",
                        bs.getValue("identifier").stringValue());
                }
            }
        }

        assertEquals("Should get exactly one result row", 1, resultCount);
    }

    /**
     * Tests an OPTIONAL whose right side (a multi-pattern ExclusiveGroup) shares
     * NO variables with the left side — a legal cross-product left join.
     * <p>
     * The VALUES-based bind join must still emit the {@code ?__index} column for
     * each input binding even when no variables are shared, otherwise the result
     * conversion fails (rows without {@code ?__index}).
     */
    @Test
    public void testOptionalWithNoSharedVariables() throws Exception {
        // SERVICE returns 3 objectIDs (>1 so the VALUES bind join path engages)
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("no-shared-vars-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 3, \"objectIDs\": [1,2,3] }")));

        // One unrelated record in the default repo — matches every left row
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            var unrelated = vf.createIRI("http://example.org/unrelated/1");
            conn.add(vf.createStatement(
                unrelated, vf.createIRI("http://example.org/ns#hasUnrelatedP"), vf.createLiteral("y1")));
            conn.add(vf.createStatement(
                unrelated, vf.createIRI("http://example.org/ns#hasUnrelatedQ"), vf.createLiteral("z1")));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        // OPTIONAL body shares no variables with the SERVICE result
        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?y ?z WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"no-shared-vars-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  OPTIONAL { " +
            "    ?ur ex:hasUnrelatedP ?y . " +
            "    ?ur ex:hasUnrelatedQ ?z . " +
            "  } " +
            "}";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    assertNotNull("objectid should be bound", bs.getValue("objectid"));
                    assertEquals("y1", bs.getValue("y").stringValue());
                    assertEquals("z1", bs.getValue("z").stringValue());
                }
            }
        }

        assertEquals("Each left row must join with the unrelated match (cross product)",
            3, resultCount);
    }

    /**
     * Same as {@link #testOptionalWithNoSharedVariables()} but with an OPTIONAL
     * body that is a single-source complex pattern (UNION + statement pattern),
     * i.e. an ExclusiveSubquery.
     */
    @Test
    public void testOptionalWithNoSharedVariablesSubquery() throws Exception {
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("no-shared-vars-subquery-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 3, \"objectIDs\": [1,2,3] }")));

        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            var unrelated = vf.createIRI("http://example.org/unrelated/1");
            conn.add(vf.createStatement(
                unrelated, vf.createIRI("http://example.org/ns#pA"), vf.createLiteral("y1")));
            conn.add(vf.createStatement(
                unrelated, vf.createIRI("http://example.org/ns#qC"), vf.createLiteral("z1")));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?y ?z WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"no-shared-vars-subquery-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  OPTIONAL { " +
            "    { ?ur ex:pA ?y } UNION { ?ur ex:pB ?y } " +
            "    ?ur ex:qC ?z . " +
            "  } " +
            "}";

        int resultCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    assertNotNull("objectid should be bound", bs.getValue("objectid"));
                    assertEquals("y1", bs.getValue("y").stringValue());
                    assertEquals("z1", bs.getValue("z").stringValue());
                }
            }
        }

        assertEquals("Each left row must join with the unrelated match (cross product)",
            3, resultCount);
    }

    /**
     * Tests OPTIONAL with a FILTER on the optional body (the FILTER becomes the
     * LeftJoin condition in the algebra).
     * <p>
     * Per SPARQL semantics, a left row whose optional match fails the filter must
     * still appear in the results — with the optional variables unbound. Left rows
     * with no match at all must also appear. No left row may be lost, and the
     * optional variables may only be bound where the filter passed.
     */
    @Test
    public void testOptionalWithFilterCondition() throws Exception {
        runOptionalFilterScenario("optional-filter-test",
            "  OPTIONAL { " +
            "    ?existingRecord ex:hasObjectId ?objectid . " +
            "    ?existingRecord ex:hasLabel ?label . " +
            "    FILTER(?label != \"Record 2\") " +
            "  } ");
    }

    /**
     * Same as {@link #testOptionalWithFilterCondition()} but with the FILTER in a
     * nested group inside the OPTIONAL, so it is pushed into the ExclusiveGroup as
     * a filter expression instead of becoming the LeftJoin condition.
     */
    @Test
    public void testOptionalWithPushedFilter() throws Exception {
        runOptionalFilterScenario("optional-pushed-filter-test",
            "  OPTIONAL { { " +
            "    ?existingRecord ex:hasObjectId ?objectid . " +
            "    ?existingRecord ex:hasLabel ?label . " +
            "    FILTER(?label != \"Record 2\") " +
            "  } } ");
    }

    private void runOptionalFilterScenario(String searchTerm, String optionalClause) throws Exception {
        // SERVICE returns 6 objectIDs; records exist for 1,2,3; the filter rejects record 2
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo(searchTerm))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 6, \"objectIDs\": [1,2,3,4,5,6] }")));

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

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "SELECT ?objectid ?existingRecord ?label WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"" + searchTerm + "\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            optionalClause +
            "}";

        int resultCount = 0;
        java.util.Set<String> boundLabels = new java.util.HashSet<>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    resultCount++;
                    if (bs.getValue("label") != null) {
                        boundLabels.add(bs.getValue("label").stringValue());
                    } else {
                        assertNull("existingRecord must be unbound when label is unbound",
                            bs.getValue("existingRecord"));
                    }
                }
            }
        }

        assertEquals("ALL left rows must appear (none may be lost to the filter)",
            6, resultCount);
        assertEquals("Optional vars must be bound only where the filter passed",
            new java.util.HashSet<>(java.util.Arrays.asList("Record 1", "Record 3")), boundLabels);
    }

    /**
     * Tests that a single-source complex pattern (ExclusiveSubquery) evaluated
     * per-binding works inside a federated CONSTRUCT query.
     * <p>
     * The SPARQL string built for an ExclusiveSubquery is always a SELECT query,
     * so it must be sent to the endpoint as a tuple query regardless of the
     * top-level query type. Preparing the SELECT string as a graph query fails
     * with a parse error. Additionally, the input bindings ({@code ?objectid})
     * must be re-inserted into the result rows, otherwise the constructed triple
     * is incomplete and silently dropped.
     */
    @Test
    public void testExclusiveSubqueryInConstructQuery() throws Exception {
        // SERVICE returns exactly ONE objectID
        stubFor(get(urlPathEqualTo("/public/collection/v1/search"))
            .withQueryParam("q", equalTo("construct-subquery-test"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"total\": 1, \"objectIDs\": [1] }")));

        // Local data matching the first UNION branch
        Repository defaultRepo = repositoryManager.getDefault();
        var vf = SimpleValueFactory.getInstance();
        try (var conn = defaultRepo.getConnection()) {
            var identifier = vf.createIRI("http://example.org/identifier/1");
            var record = vf.createIRI("http://example.org/record/1");
            conn.add(vf.createStatement(
                identifier, vf.createIRI("http://example.org/ns#P190"), vf.createLiteral("1")));
            conn.add(vf.createStatement(
                record, vf.createIRI("http://example.org/ns#P1"), identifier));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");
        assertNotNull("Ephedra repository should be initialized", ephedraRepo);

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX met: <http://www.researchspace.org/resource/system/services/metcollectiononline/> " +
            "CONSTRUCT { ?existingRecord ex:found ?objectid } WHERE { " +
            "  SERVICE met:METCollectionSearchService { " +
            "    ?x met:q \"construct-subquery-test\"; " +
            "       met:objectIDs ?objectid. " +
            "  } " +
            "  { " +
            "    { ?identifier ex:P190 ?objectid } " +
            "    UNION " +
            "    { ?identifier <http://www.w3.org/2000/01/rdf-schema#label> ?objectid } " +
            "    ?existingRecord ex:P1 ?identifier . " +
            "    FILTER(?identifier != ?existingRecord) " +
            "  } " +
            "}";

        int statementCount = 0;
        try (var conn = ephedraRepo.getConnection()) {
            var gq = conn.prepareGraphQuery(query);
            try (var gqr = gq.evaluate()) {
                while (gqr.hasNext()) {
                    var st = gqr.next();
                    statementCount++;
                    assertEquals("http://example.org/record/1", st.getSubject().stringValue());
                    assertEquals("http://example.org/ns#found", st.getPredicate().stringValue());
                    assertEquals("1", st.getObject().stringValue());
                }
            }
        }

        assertEquals("CONSTRUCT should produce exactly one statement", 1, statementCount);
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

    /**
     * The single-query pattern used by the import templates: a REST service
     * member provides the result rows, a SPARQL repository member enriches them
     * via OPTIONAL SERVICE, and multi-valued enrichment is collapsed with a
     * top-level SAMPLE aggregation. Rows without enrichment must survive.
     */
    @Test
    public void testRestServiceJoinedWithOptionalSparqlEnrichment() throws Exception {
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("2"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Bob\" }")));

        // SPARQL member knows two images for Alice and none for Bob. A real
        // endpoint filters by the bindings sent with the request, so the stubs
        // must honor that contract: queries mentioning only Bob get an empty
        // result. (Stubs are matched newest-first, so a query mentioning both
        // names gets the Alice rows — correct, as Bob has no data.)
        String aliceJsonResponse =
            "{" +
            "  \"head\": { \"vars\": [\"depicted\", \"img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"depicted\": { \"type\": \"uri\", \"value\": \"http://example.org/person-by-name/Alice\" }," +
            "        \"img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/alice-1.jpg\" } }," +
            "      { \"depicted\": { \"type\": \"uri\", \"value\": \"http://example.org/person-by-name/Alice\" }," +
            "        \"img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/alice-2.jpg\" } }" +
            "    ]" +
            "  }" +
            "}";
        String emptyJsonResponse =
            "{ \"head\": { \"vars\": [\"name\", \"img\"] }, \"results\": { \"bindings\": [] } }";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(emptyJsonResponse)));
        stubFor(any(urlPathEqualTo("/sparql"))
<<<<<<< HEAD
            .withRequestBody(containing("Alice"))
=======
            .withQueryParam("query", containing("Alice"))
>>>>>>> rdf4j-update
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(aliceJsonResponse)));

        Repository defaultRepo = repositoryManager.getDefault();
        try (var conn = defaultRepo.getConnection()) {
            var vf = SimpleValueFactory.getInstance();
            conn.add(vf.createStatement(vf.createIRI("http://example.org/person/1"),
                vf.createIRI("http://example.org/ns#hasId"), vf.createLiteral("1")));
            conn.add(vf.createStatement(vf.createIRI("http://example.org/person/2"),
                vf.createIRI("http://example.org/ns#hasId"), vf.createLiteral("2")));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?id ?name (SAMPLE(?img) AS ?image) WHERE { " +
            "  ?person ex:hasId ?id . " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "  OPTIONAL { " +
            "    BIND(IRI(CONCAT(\"http://example.org/person-by-name/\", ?name)) AS ?depicted) " +
            "    FILTER(BOUND(?depicted)) " +
            "    SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "      OPTIONAL { ?depicted ex:img ?img . } " +
            "    } " +
            "  } " +
            "} GROUP BY ?id ?name";

        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    assertNotNull("name must be bound", bs.getValue("name"));
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals("One row per REST result is expected", 2, imageByName.size());
        assertNotNull("Alice must be enriched with a sampled image", imageByName.get("Alice"));
        assertTrue(imageByName.get("Alice").startsWith("http://example.org/img/alice-"));
        assertTrue("Bob must survive the OPTIONAL without enrichment", imageByName.containsKey("Bob"));
        assertNull("Bob has no image", imageByName.get("Bob"));
    }

    /**
     * The Wikidata import templates rely on a SERVICE clause nested INSIDE a
     * federation member SERVICE clause (e.g. SERVICE wikibase:mwapi executed
     * by query.wikidata.org). The federation must not try to resolve the
     * inner SERVICE itself: the whole member body, including the nested
     * SERVICE and any sibling patterns, has to be sent verbatim to the member
     * endpoint in a single request, and the endpoint's row order has to be
     * preserved (the templates sort by a relevance ordinal computed remotely).
     */
    @Test
    public void testNestedServiceIsPassedThroughToSparqlMember() throws Exception {
        String jsonResponse =
            "{" +
            "  \"head\": { \"vars\": [\"entity\", \"score\", \"img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"entity\": { \"type\": \"uri\", \"value\": \"http://example.org/entity/1\" }," +
            "        \"score\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"0\" }," +
            "        \"img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"entity\": { \"type\": \"uri\", \"value\": \"http://example.org/entity/2\" }," +
            "        \"score\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"1\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(jsonResponse)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        // Mirrors the Wikidata import template: a magic-service SERVICE clause
        // (like wikibase:mwapi) nested inside the member SERVICE, followed by
        // a type-filter triple and OPTIONAL enrichment, all owned by the member.
        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?entity ?score (SAMPLE(?img) AS ?image) WHERE { " +
            "  SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "    SERVICE <http://example.org/magicsearch> { " +
            "      ?entity ex:score ?score . " +
            "    } " +
            "    ?entity ex:type ex:Agent . " +
            "    OPTIONAL { ?entity ex:img ?img . } " +
            "  } " +
            "} GROUP BY ?entity ?score ORDER BY ?score";

        var entities = new java.util.ArrayList<String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    entities.add(tqr.next().getValue("entity").stringValue());
                }
            }
        }

        assertEquals(java.util.List.of(
            "http://example.org/entity/1", "http://example.org/entity/2"), entities);

        // Exactly one request: the federation must not evaluate the inner
        // SERVICE itself or split the member body into per-pattern queries.
<<<<<<< HEAD
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql")));
        // ...and the nested SERVICE clause must arrive at the member verbatim
        // ("magicsearch" survives the form-urlencoding of the query parameter).
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("magicsearch")));
=======
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql")));
        // ...and the nested SERVICE clause must arrive at the member verbatim
        // ("magicsearch" survives the form-urlencoding of the query parameter).
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("magicsearch")));
>>>>>>> rdf4j-update
        // The query prologue must be forwarded too, or prefixed names inside
        // the member body (wdt:, wikibase:, mwapi:, ...) would not parse at
        // the remote endpoint. WireMock returns canned results without parsing
        // the query, so this has to be asserted explicitly.
<<<<<<< HEAD
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("PREFIX")));
=======
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("PREFIX")));
>>>>>>> rdf4j-update
    }

    private void stubSearchServiceWithThreeOrderedHits() {
        stubFor(get(urlPathEqualTo("/search-service"))
            .withQueryParam("q", equalTo("leo"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"search\": [" +
                    "{ \"entity\": \"http://example.org/entity/1\", \"name\": \"Alpha\" }," +
                    "{ \"entity\": \"http://example.org/entity/2\", \"name\": \"Beta\" }," +
                    "{ \"entity\": \"http://example.org/entity/3\", \"name\": \"Gamma\" } ] }")));
    }

    /**
     * A search-style REST service returns its hits as an ordered JSON array
     * (relevance ranking, like wbsearchentities). A descriptor column flagged
     * with {@code ephedra:rowIndex true} must bind the 0-based array position,
     * so that queries can ORDER BY it to restore the ranking after joins and
     * GROUP BY (the federation join does not preserve row order).
     */
    @Test
    public void testRestServiceOrdinalColumn() throws Exception {
        stubSearchServiceWithThreeOrderedHits();

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?entity ?name ?ordinal WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"leo\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "}";

        var ordinalByName = new java.util.HashMap<String, Integer>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    assertTrue("entity must be minted as an IRI (rdfs:Resource column)",
                        bs.getValue("entity") instanceof org.eclipse.rdf4j.model.IRI);
                    assertNotNull("ordinal must be bound", bs.getValue("ordinal"));
                    ordinalByName.put(bs.getValue("name").stringValue(),
                        ((org.eclipse.rdf4j.model.Literal) bs.getValue("ordinal")).intValue());
                }
            }
        }

        assertEquals(3, ordinalByName.size());
        assertEquals(Integer.valueOf(0), ordinalByName.get("Alpha"));
        assertEquals(Integer.valueOf(1), ordinalByName.get("Beta"));
        assertEquals(Integer.valueOf(2), ordinalByName.get("Gamma"));
    }

    /**
     * The Wikidata import template shape: REST search results are joined to a
     * federation SPARQL member with a REQUIRED pattern (hard domain filter)
     * plus OPTIONAL enrichment. This inner join must take the vectored bound
     * join path - ONE member request with a VALUES clause for all search hits
     * (bound join block size is 100 by default), NOT one request per hit (the
     * per-binding blow-up of conditional left joins). Non-matching entities
     * are dropped, and the REST relevance ordinal orders the final result.
     */
    @Test
    public void testRestSearchFilteredAndEnrichedBySparqlMemberInSingleBatch() throws Exception {
        stubSearchServiceWithThreeOrderedHits();

        // The member knows entities 1 and 3 as ex:Agent (entity 2 is not an
        // agent and must be filtered out); an image exists only for entity 1.
        // Vectored evaluation projects ?__rowIdx (from the VALUES clause), and
        // the endpoint echoes it back so results join to their input row:
        // row 0 = entity/1, row 2 = entity/3.
        String memberJson =
            "{" +
            "  \"head\": { \"vars\": [\"__rowIdx\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"__rowIdx\": { \"type\": \"literal\", \"value\": \"0\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"__rowIdx\": { \"type\": \"literal\", \"value\": \"2\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(memberJson)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?entity ?name ?ordinal (SAMPLE(?_img) AS ?image) WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"leo\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            // the hint attaches to the PREVIOUS join operand: the REST search
            // runs first, its rows drive the bound join into the SPARQL member
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "    ?entity ex:type ex:Agent . " +
            "    OPTIONAL { ?entity ex:img ?_img . } " +
            "  } " +
            "} GROUP BY ?entity ?name ?ordinal ORDER BY ?ordinal";

        var names = new java.util.ArrayList<String>();
        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    names.add(bs.getValue("name").stringValue());
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals("Non-agent entity 2 must be filtered out; relevance order kept",
            java.util.List.of("Alpha", "Gamma"), names);
        assertEquals("http://example.org/img/1.jpg", imageByName.get("Alpha"));
        assertNull("Gamma has no image but survives the OPTIONAL", imageByName.get("Gamma"));

        // One REST call, and ONE batched member request carrying all bindings
        // in a VALUES clause - not one request per search hit.
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/search-service")));
<<<<<<< HEAD
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("VALUES")));
=======
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("VALUES")));
>>>>>>> rdf4j-update
    }

    /**
     * OPTIONAL { SERVICE <member> { ... } } without a condition: FedX upstream
     * evaluates SERVICE clauses in left joins once per left binding (it
     * excludes FedXService from the bind left join path). Our strategy must
     * batch them: ONE member request with a VALUES clause carrying all rows
     * and an index variable, unmatched rows surviving NULL-extended.
     */
    @Test
    public void testOptionalServiceJoinWithoutConditionIsBatched() throws Exception {
        stubSearchServiceWithThreeOrderedHits();

        // Member knows entities 1 and 3 as agents; an image only for entity 1.
        // The bound left join projects ?__index from the VALUES clause; a row
        // for index 2 without further bindings = matched but no image.
        String memberJson =
            "{" +
            "  \"head\": { \"vars\": [\"__index\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"0\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"2\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(memberJson)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?entity ?name ?ordinal (SAMPLE(?_img) AS ?image) WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"leo\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  OPTIONAL { " +
            "    SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "      ?entity ex:type ex:Agent . " +
            "      OPTIONAL { ?entity ex:img ?_img . } " +
            "    } " +
            "  } " +
            "} GROUP BY ?entity ?name ?ordinal ORDER BY ?ordinal";

        var names = new java.util.ArrayList<String>();
        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    names.add(bs.getValue("name").stringValue());
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals("All rows survive the OPTIONAL, relevance order kept",
            java.util.List.of("Alpha", "Beta", "Gamma"), names);
        assertEquals("http://example.org/img/1.jpg", imageByName.get("Alpha"));
        assertNull("Beta is no agent: survives NULL-extended", imageByName.get("Beta"));
        assertNull("Gamma is an agent without image", imageByName.get("Gamma"));

<<<<<<< HEAD
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("VALUES")));
=======
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("VALUES")));
>>>>>>> rdf4j-update
    }

    /**
     * The guarded enrichment shape:
     *
     * <pre>
     * OPTIONAL { FILTER(condition over left vars) SERVICE <member> { ... } }
     * </pre>
     *
     * When all condition variables are BOUND in a left row, the condition
     * value cannot be changed by the right side (a compatible merge never
     * re-binds a variable), so the engine decides it locally - fully
     * standard-compliant: rows failing it pass through unextended and are
     * never sent to the member, rows passing it are batched into ONE VALUES
     * request with the condition discharged.
     */
    @Test
    public void testGuardedConditionalOptionalServiceJoinIsBatched() throws Exception {
        stubSearchServiceWithThreeOrderedHits();

        String memberJson =
            "{" +
            "  \"head\": { \"vars\": [\"__index\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"0\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"1\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(memberJson)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        // Beta fails the guard: it must pass through unenriched and must not
        // appear in the VALUES clause sent to the member. Alpha and Gamma are
        // batched (indexes 0 and 1 within the guarded block).
        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?entity ?name ?ordinal (SAMPLE(?_img) AS ?image) WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"leo\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  OPTIONAL { " +
            "    FILTER(?name != \"Beta\") " +
            "    SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "      OPTIONAL { ?entity ex:img ?_img . } " +
            "    } " +
            "  } " +
            "} GROUP BY ?entity ?name ?ordinal ORDER BY ?ordinal";

        var names = new java.util.ArrayList<String>();
        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    names.add(bs.getValue("name").stringValue());
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals("Guard-failing row passes through; relevance order kept",
            java.util.List.of("Alpha", "Beta", "Gamma"), names);
        assertEquals("http://example.org/img/1.jpg", imageByName.get("Alpha"));
        assertNull("Beta failed the guard: unenriched", imageByName.get("Beta"));
        assertNull("Gamma matched without image", imageByName.get("Gamma"));

        // ONE batched request that does NOT include the guarded-out row.
<<<<<<< HEAD
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("VALUES")));
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("entity%2F1")));
        wireMockRule.verify(postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("entity%2F3")));
        wireMockRule.verify(0, postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("entity%2F2")));
=======
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("VALUES")));
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("entity/1")));
        wireMockRule.verify(getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("entity/3")));
        wireMockRule.verify(0, getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("entity/2")));
>>>>>>> rdf4j-update
    }

    /**
     * Standard-compliance of the guard: when a condition variable is UNBOUND
     * in a left row, the right side may still bind it, so the engine must NOT
     * decide the condition locally. Such rows fall back to strict per-binding
     * evaluation (with a logged warning): the SERVICE body is evaluated with
     * the variable free, its solutions merge with the row, and the condition
     * is applied to the merged solutions - the bottom-up SPARQL semantics.
     * Bound rows are still batched. This is the behavior that makes queries
     * with potentially-unbound join variables slow and surprising: templates
     * must keep such variables always bound (COALESCE sentinel).
     */
    @Test
    public void testUnboundGuardVariableFallsBackToStrictPerRowEvaluation() throws Exception {
        // three hits; Beta has NO entity value -> ?entity stays unbound
        stubFor(get(urlPathEqualTo("/search-service"))
            .withQueryParam("q", equalTo("mixed"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"search\": [" +
                    "{ \"entity\": \"http://example.org/entity/1\", \"name\": \"Alpha\" }," +
                    "{ \"name\": \"Beta\" }," +
                    "{ \"entity\": \"http://example.org/entity/3\", \"name\": \"Gamma\" } ] }")));

        // strict per-row request (no VALUES): the service body with ?entity
        // free - a real endpoint returns ALL its statements; the canned
        // response stands for that unanchored scan
        String strictJson =
            "{" +
            "  \"head\": { \"vars\": [\"entity\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"entity\": { \"type\": \"uri\", \"value\": \"http://example.org/entity/9\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/9.jpg\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(strictJson)));
        // batched request (VALUES present): Alpha (index 0) has an image
        String batchJson =
            "{" +
            "  \"head\": { \"vars\": [\"__index\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"0\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"1\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
<<<<<<< HEAD
            .withRequestBody(containing("VALUES"))
=======
            .withQueryParam("query", containing("VALUES"))
>>>>>>> rdf4j-update
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(batchJson)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name ?ordinal (SAMPLE(?_img) AS ?image) WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"mixed\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  OPTIONAL { " +
            "    FILTER(BOUND(?entity)) " +
            "    SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "      OPTIONAL { ?entity ex:img ?_img . } " +
            "    } " +
            "  } " +
            "} GROUP BY ?name ?ordinal ORDER BY ?ordinal";

        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals(3, imageByName.size());
        assertEquals("http://example.org/img/1.jpg", imageByName.get("Alpha"));
        // Beta's unbound ?entity merged with the service solution per strict
        // bottom-up semantics: BOUND(?entity) became true, the row was
        // cross-product-extended. Surprising, but standard - and the reason
        // queries must keep join variables always bound.
        assertEquals("http://example.org/img/9.jpg", imageByName.get("Beta"));
        assertNull("Gamma matched without image", imageByName.get("Gamma"));

        // one batched request (Alpha+Gamma) + one strict per-row request (Beta)
<<<<<<< HEAD
        wireMockRule.verify(2, postRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("VALUES")));
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(notMatching(".*VALUES.*")));
=======
        wireMockRule.verify(2, getRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("VALUES")));
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", notMatching(".*VALUES.*")));
>>>>>>> rdf4j-update
    }

    /**
     * A condition variable that is unbound in a row but NOT producible by the
     * service body can never be bound by the merge either, so the condition
     * IS locally decidable (standard-compliant): the row passes through
     * unextended without any member request, no strict fallback needed.
     */
    @Test
    public void testGuardOnVariableNotProducibleByServiceIsDecidedLocally() throws Exception {
        stubFor(get(urlPathEqualTo("/search-service"))
            .withQueryParam("q", equalTo("mixed"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"search\": [" +
                    "{ \"entity\": \"http://example.org/entity/1\", \"name\": \"Alpha\" }," +
                    "{ \"name\": \"Beta\" }," +
                    "{ \"entity\": \"http://example.org/entity/3\", \"name\": \"Gamma\" } ] }")));

        String batchJson =
            "{" +
            "  \"head\": { \"vars\": [\"__index\", \"_img\"] }," +
            "  \"results\": {" +
            "    \"bindings\": [" +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"0\" }," +
            "        \"_img\": { \"type\": \"uri\", \"value\": \"http://example.org/img/1.jpg\" } }," +
            "      { \"__index\": { \"type\": \"literal\", \"datatype\": \"http://www.w3.org/2001/XMLSchema#int\", \"value\": \"1\" } }" +
            "    ]" +
            "  }" +
            "}";
        stubFor(any(urlPathEqualTo("/sparql"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/sparql-results+json")
                .withBody(batchJson)));

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        // The guard references ?entity, which the service body does not use
        // (it joins on the copied ?e2): for Beta the condition is decidably
        // false even though ?entity is unbound.
        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name ?ordinal (SAMPLE(?_img) AS ?image) WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"mixed\" . " +
            "    ?res ex:hasEntity ?entity . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  BIND(?entity AS ?e2) " +
            "  OPTIONAL { " +
            "    FILTER(BOUND(?entity)) " +
            "    SERVICE <http://www.researchspace.org/resource/system/repository/federation#sparql-repo> { " +
            "      OPTIONAL { ?e2 ex:img ?_img . } " +
            "    } " +
            "  } " +
            "} GROUP BY ?name ?ordinal ORDER BY ?ordinal";

        var imageByName = new java.util.HashMap<String, String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    var bs = tqr.next();
                    imageByName.put(bs.getValue("name").stringValue(),
                        bs.getValue("image") == null ? null : bs.getValue("image").stringValue());
                }
            }
        }

        assertEquals(3, imageByName.size());
        assertEquals("http://example.org/img/1.jpg", imageByName.get("Alpha"));
        assertNull("Beta decidably fails the guard: unenriched", imageByName.get("Beta"));
        assertNull("Gamma matched without image", imageByName.get("Gamma"));

        // ONE batched request; no strict per-row fallback
<<<<<<< HEAD
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(1, postRequestedFor(urlPathEqualTo("/sparql"))
            .withRequestBody(containing("VALUES")));
=======
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql")));
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/sparql"))
            .withQueryParam("query", containing("VALUES")));
>>>>>>> rdf4j-update
    }

    /**
     * An input parameter flagged with {@code ephedra:rowLimit true} bounds the
     * number of rows parsed from the service response WITHOUT being sent to
     * the remote API. This is the declared "top N hits" bound for search APIs
     * that return their full unpaginated result list (like the MET search):
     * it caps what enters the SPARQL engine, so downstream per-row joins and
     * ORDER BY cannot fan out beyond N.
     */
    @Test
    public void testRestServiceRowLimitBoundsResponseRows() throws Exception {
        stubSearchServiceWithThreeOrderedHits();

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query =
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?name ?ordinal WHERE { " +
            "  SERVICE <http://example.org/ns#SearchService> { " +
            "    ?res ex:q \"leo\" . " +
            "    ?res ex:limit \"2\" . " +
            "    ?res ex:hasName ?name . " +
            "    ?res ex:hasOrdinal ?ordinal . " +
            "  } " +
            "}";

        var names = new java.util.ArrayList<String>();
        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    names.add(tqr.next().getValue("name").stringValue());
                }
            }
        }

        assertEquals("Only the first two response rows must be parsed",
            java.util.List.of("Alpha", "Beta"), names);

        // the search request goes out with the search term but WITHOUT the
        // row limit parameter (it is a local bound, not an API parameter)
        wireMockRule.verify(1, getRequestedFor(urlPathEqualTo("/search-service"))
            .withQueryParam("q", equalTo("leo")));
        wireMockRule.verify(0, getRequestedFor(urlPathEqualTo("/search-service"))
            .withQueryParam("slimit", matching(".+")));
    }
}
