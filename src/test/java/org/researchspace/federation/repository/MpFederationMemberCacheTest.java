/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;

import java.io.StringReader;
import java.util.concurrent.atomic.AtomicInteger;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.junit.Test;
import org.mockito.Mockito;
import org.researchspace.repository.RepositoryManager;

/**
 * Member SERVICE resolution runs on the query hot path (once per SERVICE join
 * evaluation and per bind-join batch, from FedX worker threads), while
 * {@link RepositoryManager}'s methods are globally synchronized — admin
 * operations hold that monitor across storage I/O and repository shutdown.
 * Resolution results are parse-time constants for the lifetime of a federation
 * instance (member config changes reinitialize the federation), so they must
 * be cached instead of re-resolved per call.
 */
public class MpFederationMemberCacheTest {

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    private static final String PREFIXES = "@prefix fedx: <http://rdf4j.org/config/federation#> .\n"
            + "@prefix ephedra: <http://www.researchspace.org/resource/system/ephedra#> .\n"
            + "@prefix config: <tag:rdf4j.org,2023:config/> .\n"
            + "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n";

    private static final String SINGLE_MEMBER = "<urn:impl> ephedra:defaultMember \"default\" ;\n"
            + "  config:fed.member [ ephedra:delegateRepositoryID \"member-a\" ;\n"
            + "                      ephedra:serviceReference <http://example.org/svc> ] .\n";

    private MpFederationConfig parse(String ttlBody) throws Exception {
        Model model = Rio.parse(new StringReader(PREFIXES + ttlBody), "", RDFFormat.TURTLE);
        MpFederationConfig config = new MpFederationConfig();
        config.parse(model, vf.createIRI("urn:impl"));
        return config;
    }

    @Test
    public void repositoryIdMappingsAreMemoized() throws Exception {
        MpFederationConfig config = parse(SINGLE_MEMBER);
        assertSame("the SERVICE-IRI mappings are parse-time constants and must not be rebuilt on every call",
                config.getRepositoryIDMappings(), config.getRepositoryIDMappings());
    }

    @Test
    public void memberResolutionIsCachedPerServiceUri() throws Exception {
        MpFederationConfig config = parse(SINGLE_MEMBER);
        MpFederation federation = new MpFederation(config);

        RepositoryManager manager = Mockito.mock(RepositoryManager.class);
        SailRepository memberRepo = new SailRepository(new MemoryStore());
        Mockito.when(manager.getRepository("member-a")).thenReturn(memberRepo);

        AtomicInteger managerLookups = new AtomicInteger();
        federation.repositoryManagerProvider = () -> {
            managerLookups.incrementAndGet();
            return manager;
        };

        assertSame(memberRepo, federation.getServiceMemberRepository("http://example.org/svc"));
        assertFalse(federation.isRestBackedService("http://example.org/svc"));
        assertSame(memberRepo, federation.getServiceMemberRepository("http://example.org/svc"));
        assertEquals("member resolution must hit the RepositoryManager once per SERVICE URI, "
                + "not once per join evaluation", 1, managerLookups.get());

        assertNull(federation.getServiceMemberRepository("http://example.org/unknown"));
        assertFalse(federation.isRestBackedService("http://example.org/unknown"));
        assertEquals("SERVICE URIs outside the member mappings must not touch the RepositoryManager",
                1, managerLookups.get());
    }
}
