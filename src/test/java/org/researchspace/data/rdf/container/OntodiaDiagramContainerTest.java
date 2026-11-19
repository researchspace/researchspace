/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.data.rdf.container;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.vocabulary.OWL;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.researchspace.junit.ResearchSpaceGuiceTestModule;
import org.researchspace.junit.TestUtils;
import org.researchspace.vocabulary.LDP;

import com.github.sdorra.shiro.SubjectAware;

/**
 * A new diagram must not get an IRI that already names something: its graph is named after
 * the IRI and is cleared when the diagram is deleted.
 */
@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public class OntodiaDiagramContainerTest extends AbstractLDPTest {
    private static final String BASE = "http://www.researchspace.org/testinstances/";

    private LDPResource createDiagram(String slug) throws Exception {
        return api.createLDPResource(Optional.of(slug),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                OntodiaDiagramContainer.IRI, BASE);
    }

    private void assertRefused(IRI iri) throws Exception {
        try {
            createDiagram(iri.stringValue());
            fail("Diagram was created with an IRI that is in use: " + iri);
        } catch (IllegalArgumentException e) {
            assertTrue(e.getMessage().contains(iri.stringValue()));
        }
        assertFalse(connection().hasStatement(null, LDP.contains, iri));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile)
    public void createsDiagramWithUnusedIri() throws Exception {
        IRI iri = vf.createIRI("http://www.researchspace.org/diagram");
        assertEquals(iri, createDiagram(iri.stringValue()).getResourceIRI());
        assertTrue(connection().hasStatement(OntodiaDiagramContainer.IRI, LDP.contains, iri));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile)
    public void refusesIriOfAnotherResource() throws Exception {
        IRI entity = vf.createIRI("http://www.researchspace.org/entity");
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(entity, RDF.TYPE, OWL.THING);
        }
        assertRefused(entity);
        assertEquals(1, connection().getOutgoingStatements(entity).size());
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile)
    public void refusesIriWhoseGraphHasContent() throws Exception {
        // an ontology is stored in the graph <ontology IRI> + "context"
        IRI ontology = vf.createIRI("http://www.researchspace.org/ontology/");
        IRI graph = vf.createIRI("http://www.researchspace.org/ontology/context");
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(vf.createIRI("http://www.researchspace.org/ontology/Thing"), RDF.TYPE, OWL.CLASS, graph);
        }
        assertRefused(ontology);
        assertEquals(1, connection().size(graph));
    }
}
