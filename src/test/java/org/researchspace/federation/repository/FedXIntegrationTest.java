/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.Assert.*;

import java.util.Arrays;

import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
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


public class FedXIntegrationTest extends AbstractIntegrationTest {

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
        ClassPathStorage.Config config = new ClassPathStorage.Config("fedx");
        ClassPathStorage cpStorage = new ClassPathStorage(new PathMapping.Default(), getClass().getClassLoader(), config);
        storageRule.getPlatformStorage().addStorage("classpath", cpStorage);

        // Re-initialize ServiceRegistry to pick up new descriptors from ClassPathStorage
        injector.getInstance(MpSparqlServiceRegistry.class);

        // Re-initialize Repositories to pick up new configs from ClassPathStorage
        // We use a single call now that RepositoryDependencySorter handles FedX dependencies correctly.
        repositoryManager.reinitializeRepositories(Arrays.asList(
            "service-a",
            "repo1", "repo2", "repo3",
            "fedx-test", "fedx-internal",
            "ephedra-wrapper"
        ));
    }

    @Test
    public void testMultiRepoTransparentFederation() throws Exception {
        // Repositories repo1, repo2, and fedx-test are configured via TTL files

        // Add data to repo1
        try (RepositoryConnection conn = repositoryManager.getRepository("repo1").getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#name"),
                SimpleValueFactory.getInstance().createLiteral("Alice")
            ));
        }

        // Add data to repo2
        try (RepositoryConnection conn = repositoryManager.getRepository("repo2").getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#city"),
                SimpleValueFactory.getInstance().createLiteral("London")
            ));
        }

        Repository fedxRepo = repositoryManager.getRepository("fedx-test");
        assertNotNull("FedX repository should be initialized", fedxRepo);

        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "SELECT ?name ?city WHERE { " +
            "  ?person ex:name ?name . " +
            "  ?person ex:city ?city . " +
            "}";

        try (RepositoryConnection conn = fedxRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                assertTrue("Query should return results", tqr.hasNext());
                var bs = tqr.next();
                assertEquals("Alice", bs.getValue("name").stringValue());
                assertEquals("London", bs.getValue("city").stringValue());
            }
        }
    }

    @Test
    public void testEphedraOverFedXFederation() throws Exception {
        // Setup WireMock for Service A (Ephedra)
        stubFor(get(urlPathEqualTo("/service-a"))
            .withQueryParam("id", equalTo("1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{ \"name\": \"Alice\" }")));

        // Repositories repo3, fedx-internal, and ephedra-wrapper are configured via TTL files

        // Add data to repo3
        try (RepositoryConnection conn = repositoryManager.getRepository("repo3").getConnection()) {
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#hasId"),
                SimpleValueFactory.getInstance().createLiteral("1")
            ));
            conn.add(SimpleValueFactory.getInstance().createStatement(
                SimpleValueFactory.getInstance().createIRI("http://example.org/person/1"),
                SimpleValueFactory.getInstance().createIRI("http://example.org/ns#age"),
                SimpleValueFactory.getInstance().createLiteral("30")
            ));
        }

        Repository ephedraWrapper = repositoryManager.getRepository("ephedra-wrapper");
        assertNotNull("Ephedra wrapper repository should be initialized", ephedraWrapper);

        // Query Ephedra wrapper
        // It should delegate ?person ex:hasName ?name to ServiceA (via Ephedra)
        // And ?person ex:age ?age to FedX (via default member) -> repo3
        String query = 
            "PREFIX ex: <http://example.org/ns#> " +
            "PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#> " +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " +
            "SELECT ?name ?age WHERE { " +
            "  ?person ex:hasId ?id . " +
            "  ephedra:Prior ephedra:executeFirst \"true\"^^xsd:boolean . " +
            "  ?person ex:age ?age . " +
            "  SERVICE <http://example.org/ns#ServiceA> { " +
            "    ?person ex:hasId ?id . " +
            "    ?person ex:hasName ?name . " +
            "  } " +
            "}";

        try {
            try (RepositoryConnection conn = ephedraWrapper.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery(query);
                try (TupleQueryResult tqr = tq.evaluate()) {
                    assertTrue("Query should return results", tqr.hasNext());
                    var bs = tqr.next();
                    assertEquals("Alice", bs.getValue("name").stringValue());
                    assertEquals("30", bs.getValue("age").stringValue());
                }
            }
        } catch (Throwable e) {
            System.out.println("WireMock Requests:");
            findAll(anyRequestedFor(anyUrl())).forEach(r -> System.out.println(r));
            throw e;
        }
    }
}
