/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.Assert.*;

import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.storage.api.PathMapping;
import org.researchspace.services.storage.file.ClassPathStorage;

import com.github.tomakehurst.wiremock.junit.WireMockRule;
import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * REST service failures (HTTP 4xx/5xx) inside a federated query must fail the
 * query instead of silently producing empty or partial results.
 */
public class RestServiceErrorPropagationTest extends AbstractIntegrationTest {

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
        ClassPathStorage.Config config = new ClassPathStorage.Config("ephedra");
        ClassPathStorage cpStorage = new ClassPathStorage(new PathMapping.Default(), getClass().getClassLoader(),
                config);
        storageRule.getPlatformStorage().addStorage("classpath", cpStorage);

        injector.getInstance(MpSparqlServiceRegistry.class);

        repositoryManager.reinitializeRepositories(
                java.util.Arrays.asList("service-a", "service-b", "ephedra", "service-old", "ephedra-old",
                        "met-search", "met-object", "sparql-repo", "search-service"));
    }

    @Test
    public void failingRestServiceFailsTheQuery() throws Exception {
        stubFor(get(urlPathEqualTo("/service-a"))
                .willReturn(aResponse().withStatus(500).withBody("internal error")));

        Repository defaultRepo = repositoryManager.getDefault();
        try (var conn = defaultRepo.getConnection()) {
            var vf = SimpleValueFactory.getInstance();
            conn.add(vf.createStatement(vf.createIRI("http://example.org/person/1"),
                    vf.createIRI("http://example.org/ns#hasId"), vf.createLiteral("1")));
        }

        Repository ephedraRepo = repositoryManager.getRepository("ephedra");

        String query = "PREFIX ex: <http://example.org/ns#> "
                + "SELECT ?name WHERE { "
                + "  ?person ex:hasId ?id . "
                + "  SERVICE <http://example.org/ns#ServiceA> { "
                + "    ?person ex:hasId ?id . "
                + "    ?person ex:hasName ?name . "
                + "  } "
                + "}";

        try (var conn = ephedraRepo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery(query);
            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    tqr.next();
                }
                fail("expected QueryEvaluationException when the REST service returns HTTP 500");
            } catch (QueryEvaluationException e) {
                // expected: the HTTP error must fail the query, not silently
                // return empty results
            }
        }
    }
}
