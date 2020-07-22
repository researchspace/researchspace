/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.data.rdf.container;

import static org.hamcrest.CoreMatchers.containsString;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.StringReader;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.rio.Rio;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LDPContainer;
import org.researchspace.data.rdf.container.LDPR;
import org.researchspace.data.rdf.container.LDPResource;
import org.researchspace.data.rdf.container.RDFStream;
import org.researchspace.data.rdf.container.RootContainer;
import org.researchspace.junit.ResearchSpaceGuiceTestModule;
import org.researchspace.junit.TestUtils;
import org.researchspace.ldptest.LDPTestContainer;
import org.researchspace.ldptest.LDPTestResource;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.PROV;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.rio.RDFFormat;

import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

/**
 * General tests for {@link LDPApiInternal}
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public class LDPApiTest extends AbstractLDPTest {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    /**
     * Create new container from turtle input stream
     * 
     * @return
     * @throws Exception
     */
    public LDPResource createNewContainer() throws Exception {
        LDPResource cnt = api.createLDPResource(Optional.of("DummyContainer"),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");
        assertEquals(RootContainer.IRI, cnt.getParentContainer());
        assertTrue(cnt.isContainer());
        assertTrue(cnt.getLDPTypes().containsAll(Sets.newHashSet(LDP.Resource, LDP.Container)));

        // repository MUST contain a tdf:type ldp:Container,ldp:Resource statements
        // (while other statements such as comments might only exist virtually i.e. by
        // returning the getModel()
        assertTrue(connection().hasStatement(cnt.getResourceIRI(), RDF.TYPE, LDP.Container));
        assertTrue(connection().hasStatement(cnt.getResourceIRI(), RDF.TYPE, LDP.Resource));

        // repository MUST contain a ldp:contains statement linking the container to the
        // ROOT container AND this statement must be in the context of the child
        // container
        assertTrue(
                connection().hasStatement(RootContainer.IRI, LDP.contains, cnt.getResourceIRI(), cnt.getContextIRI()));

        // assert that what is stored in the container is actually a superset of what
        // have been committed
        assertTrue(Models.isSubset(
                TestUtils.readTurtleInputStreamIntoModel(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL),
                        cnt.getResourceIRI(), cnt.getContextIRI()),
                cnt.getModel()));

        // assert that the POJO has been instantiated correctly
        assertTrue(LDPContainer.class.isAssignableFrom(cnt.getClass()));

        return cnt;
    }

    /**
     * Add resource to newly created container
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void addResourceToContainer() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        LDPResource res = api.createLDPResource(Optional.of("DummyResource"),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");

        Model modelToCheck = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), res.getResourceIRI(), res.getContextIRI());

        checkCreatedResourceValidity(cnt, res, modelToCheck);
    }

    /**
     * Test add resource from a model to a newly created container
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void addResourceToContainerFromModel() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        IRI baseIRI = VF.createIRI("http://example.org/testResource");

        Model model = TestUtils
                .readTurtleInputStreamIntoModel(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), baseIRI);
        PointedGraph pointedGraph = new PointedGraph(baseIRI, model);

        LDPResource res = api.createLDPResource(pointedGraph, cnt.getResourceIRI());

        Model modelToCheck = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), res.getResourceIRI(), res.getContextIRI());
        checkCreatedResourceValidity(cnt, res, modelToCheck);
    }

    protected void checkCreatedResourceValidity(LDPContainer cnt, LDPResource res, Model modelToCheck)
            throws Exception {
        assertEquals(cnt.getResourceIRI(), res.getParentContainer());
        assertFalse(LDPContainer.class.isAssignableFrom(res.getClass()));
        assertTrue(LDPResource.class.isAssignableFrom(res.getClass()));
        assertFalse(res.isContainer());
        assertTrue(cnt.getLDPTypes().containsAll(Sets.newHashSet(LDP.Resource)));

        assertTrue(connection().hasStatement(res.getResourceIRI(), RDF.TYPE, LDP.Resource));
        assertFalse(connection().hasStatement(res.getResourceIRI(), RDF.TYPE, LDP.Container));

        // repository MUST contain a ldp:contains statement linking the container to the
        // parent container AND this statement must be in the context of the child
        // container
        assertTrue(connection().hasStatement(cnt.getResourceIRI(), LDP.contains, res.getResourceIRI(),
                res.getContextIRI()));

        // assert that what is stored in the container is actually a superset of what
        // have been committed
        assertTrue(Models.isSubset(modelToCheck, res.getModel()));

        // assert that the returned model of the default {@link AbstractLDPResource}
        // container does not output incoming ldp:contains
        // in this case there are no outgoing, since it is a resource and no container
        assertFalse(res.getModel().contains(null, LDP.contains, res.getResourceIRI()));
    }

    /**
     * Test update resource using a prepared model.
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testUpdateResourceFromModel() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        IRI baseIRI = VF.createIRI("http://example.org/testResource");

        Model model = TestUtils
                .readTurtleInputStreamIntoModel(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), baseIRI);
        PointedGraph pointedGraph = new PointedGraph(baseIRI, model);

        LDPResource res = api.createLDPResource(pointedGraph, cnt.getResourceIRI());

        Model modelToCheck = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), res.getResourceIRI(), res.getContextIRI());
        checkCreatedResourceValidity(cnt, res, modelToCheck);

        Model modelToUpdate = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), baseIRI, res.getContextIRI());

        modelToUpdate.remove(baseIRI, RDFS.COMMENT, null);
        modelToUpdate.add(baseIRI, RDFS.COMMENT, VF.createLiteral("This is an updated LDP Dummy Resource"));
        PointedGraph graphToUpdate = new PointedGraph(baseIRI, modelToUpdate);
        api.updateLDPResource(graphToUpdate);

        Model modelToCheckUpdated = new TreeModel(modelToCheck);
        modelToCheckUpdated.remove(baseIRI, RDFS.COMMENT, null);
        modelToCheckUpdated.add(baseIRI, RDFS.COMMENT, VF.createLiteral("This is an updated LDP Dummy Resource"),
                res.getContextIRI());

        checkCreatedResourceValidity(cnt, res, modelToCheckUpdated);

        assertFalse(Models.isSubset(modelToCheck, res.getModel()));
    }

    /**
     * Try to GET a LDP Resource which does not exist
     * 
     * @throws Exception
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testGetLDPResourceNotExists() throws Exception {
        exception.expect(IllegalArgumentException.class);
        exception.expectMessage(containsString("There exists no LDP Resource"));
        api.getLDPResource(vf.createIRI("http://www.researchspace.org/non-existing-resource/"));
    }

    /**
     * Try to add Non-Container LDP Resource to {@link RootContainer}
     * 
     * @throws Exception
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void failToCreateNonContainerResourceInRootContainer() throws Exception {
        exception.expect(IllegalArgumentException.class);
        exception.expectMessage(containsString("Only LDP Container can be added to the Platform Root Container"));
        api.createLDPResource(Optional.of("TestResource"),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testGetLDPResource() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        String absolutSlugURI = "http://www.researchspace.org/slug";
        LDPResource tmpRes = api.createLDPResource(Optional.of(absolutSlugURI),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");

        assertEquals(vf.createIRI(absolutSlugURI), tmpRes.getResourceIRI());

        LDPResource res = api.getLDPResource(vf.createIRI(absolutSlugURI));
        assertNotNull(res);
        assertEquals(vf.createIRI(absolutSlugURI), res.getResourceIRI());

        String absolutSlugURI2 = "http://www.researchspace.org/slug2";
        LDPResource res2 = api.createLDPResource(Optional.of(absolutSlugURI2),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");
        assertNotNull(res2);
        assertEquals(vf.createIRI(absolutSlugURI2), res2.getResourceIRI());

        assertEquals(2, cnt.getContainedResources().size());
        assertTrue(Sets.newHashSet((Resource) res2.getResourceIRI(), (Resource) vf.createIRI(absolutSlugURI))
                .containsAll(cnt.getContainedResources()));
        assertFalse(cnt.getContainedResources().contains(vf.createIRI("http://www.researchspace.org/none-existing")));
    }

    @Test(expected = IllegalArgumentException.class)
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testCreateResourceWithTheSameIri() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        String absolutSlugURI = "http://www.researchspace.org/slug";
        LDPResource tmpRes = api.createLDPResource(Optional.of(absolutSlugURI),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");

        assertEquals(vf.createIRI(absolutSlugURI), tmpRes.getResourceIRI());
        LDPResource res2 = api.createLDPResource(Optional.of(absolutSlugURI),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");
    }

    @Test(expected = IllegalArgumentException.class)
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testCreateResourceIriWithIllegalCharactersInSlag() throws Exception {
        String slugWithIllegalCharacters = "slug =>";
        api.createResourceIRI(Optional.of(slugWithIllegalCharacters),
                vf.createIRI("http://www.researchspace.org/testContainers"), "http://www.researchspace.org/testinstances/");
    }

    /**
     * Create container with custom implementation {@link LDPTestContainer}
     * annotated with {@link LDPR}, which is in a different package
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testCreateLDPContainerImplementationLookup() throws Exception {
        LDPResource res = api.createLDPResource(Optional.of(LDPTestContainer.iriString),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");
        assertTrue(LDPTestContainer.class.isAssignableFrom(res.getClass()));

        // add programmatically a LDP Resource
        IRI person123 = vf.createIRI("http://www.test.com/person123");
        Literal personName = vf.createLiteral("Hans Peter");
        LDPTestContainer cnt = ((LDPTestContainer) res);
        cnt.add(new PointedGraph(person123,
                new LinkedHashModel(Lists.newArrayList(vf.createStatement(person123, RDF.TYPE, FOAF.PERSON),
                        vf.createStatement(person123, FOAF.NAME, personName)))));

        // assert that the returned model of the default {@link AbstractLDPResource}
        // container does not output incoming ldp:contains
        assertFalse(cnt.getModel().contains(null, LDP.contains, cnt.getResourceIRI()));
        // and in general no incoming statements
        assertFalse(cnt.getModel().contains(null, null, cnt.getResourceIRI()));
        assertTrue(cnt.getModel().contains(cnt.getResourceIRI(), LDP.contains, null));

        LDPResource person = api.getLDPResource(person123);

        assertNotNull(person);
        assertTrue(LDPTestResource.class.isAssignableFrom(person.getClass()));
        // we expect this to be automatically instantiated as {@link LDPTestResource}

        assertEquals(personName, ((LDPTestResource) person).getPersonName());

    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testAddResourceToNonExistingContainer() throws Exception {
        // assert that triple store is empty
        // this test is likely to fail if being executed in parallel
        assertEquals(0, connection().size());

        // assert that it is not possible to add a res to a container which does
        // not exist yet and also does not have a implementation
        exception.expect(IllegalArgumentException.class);
        exception.expectMessage(containsString("Target resource htt://www.test.de/nonexisting is not a container."));
        api.createLDPResource(Optional.of("http://www.researchspace.org/slug"),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                vf.createIRI("htt://www.test.de/nonexisting"), "http://www.researchspace.org/testinstances/");
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testGetContainedResourcesEmpty() throws Exception {
        // getContainedResources with two resources is already tested above

        LDPContainer cnt = (LDPContainer) createNewContainer();

        assertEquals(0, cnt.getContainedResources().size());
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void containsLDPResourceTest() throws Exception {
        LDPContainer cnt = (LDPContainer) createNewContainer();

        String absolutSlugURI = "http://www.researchspace.org/slug";
        LDPResource tmpRes = api.createLDPResource(Optional.of(absolutSlugURI),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE),
                cnt.getResourceIRI(), "http://www.researchspace.org/testinstances/");

        LDPResource res = api.getLDPResource(vf.createIRI(absolutSlugURI));

        assertEquals(vf.createIRI(absolutSlugURI), tmpRes.getResourceIRI());
        assertFalse(cnt.containsLDPResource(vf.createIRI("http://www.researchspace.org/none-existing")));
        assertTrue(cnt.containsLDPResource(res.getResourceIRI()));
    }

    final static String trigFile = "<http://www.testcontainer.com/context> {\n"
            + "        _:node1bapojdjix178 <http://www.w3.org/ns/ldp#contains> <http://www.testcontainer.com> .\n"
            + "        <http://www.testcontainer.com> a <http://www.w3.org/ns/ldp#Container> , <http://www.w3.org/ns/ldp#Resource> , <http://www.w3.org/ns/prov#Entity> ;\n"
            + "                <http://www.w3.org/2000/01/rdf-schema#comment> \"Dummy Container for testing\" ;\n"
            + "                <http://www.w3.org/2000/01/rdf-schema#label> \"Dummy Container\" ;\n"
            + "                <http://www.w3.org/ns/prov#generatedAtTime> \"2017-03-09T16:47:13.754+02:00\"^^<http://www.w3.org/2001/XMLSchema#dateTime> ;\n"
            + "                <http://www.w3.org/ns/prov#wasAttributedTo> <http://www.researchspace.org/resource/user/admin> .\n"
            + "}\n" + "<http://www.test.com/person123/context> {\n"
            + "        <http://www.testcontainer.com> <http://www.w3.org/ns/ldp#contains> <http://www.test.com/person123> .\n"
            + "        <http://www.test.com/person123> a <http://www.w3.org/ns/ldp#Resource> , <http://www.w3.org/ns/prov#Entity> , <http://xmlns.com/foaf/0.1/Person> ;\n"
            + "                <http://www.w3.org/ns/prov#generatedAtTime> \"2017-03-09T16:47:13.756+02:00\"^^<http://www.w3.org/2001/XMLSchema#dateTime> ;\n"
            + "                <http://www.w3.org/ns/prov#wasAttributedTo> <http://www.researchspace.org/resource/user/admin> ;\n"
            + "                <http://xmlns.com/foaf/0.1/name> \"Hans Peter\" .\n" + "}\n" + "{\n"
            + "        _:node1bapojdjix178 a <http://www.w3.org/ns/ldp#Container> , <http://www.w3.org/ns/ldp#Resource> .\n"
            + "}";

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testExportResource() throws Exception {
        LDPResource res = api.createLDPResource(Optional.of(LDPTestContainer.iriString),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");
        IRI person123 = vf.createIRI("http://www.test.com/person123");
        Literal personName = vf.createLiteral("Hans Peter");
        ((LDPTestContainer) res).add(new PointedGraph(person123,
                new LinkedHashModel(Lists.newArrayList(vf.createStatement(person123, RDF.TYPE, FOAF.PERSON),
                        vf.createStatement(person123, FOAF.NAME, personName)))));

        Model exportedModel = api.exportLDPResource(res.getResourceIRI());

        Model compareModel = Rio.parse(new StringReader(trigFile), "", RDFFormat.TRIG);

        exportedModel.remove(null, PROV.generatedAtTime, null);
        compareModel.remove(null, PROV.generatedAtTime, null);

        assertTrue(Models.isomorphic(exportedModel, compareModel));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testImportResource() throws Exception {
        Set<IRI> possibleContainers = Sets.newHashSet();
        Set<IRI> unknownObjects = Sets.newHashSet();
        Model testModel = Rio.parse(new StringReader(trigFile), "", RDFFormat.TRIG);
        List<LDPResource> ldpResources = api.importLDPResource(testModel, possibleContainers, Optional.empty(),
                unknownObjects, false, "");
        assertNull(ldpResources);

        assertEquals(possibleContainers.size(), 0);
        /*
         * All objects not present in subjects ldp:Container ldp:Resource -- removed by
         * metadata strip prov:Entity -- removed by metadata strip foaf:Person
         * http://www.researchspace.org/resource/user/admin -- removed by metadata strip
         */
        assertEquals(unknownObjects.size(), 2);
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testImportResourceContainerPresent() throws Exception {
        api.createLDPResource(Optional.of(LDPTestContainer.iriString),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");

        Set<IRI> possibleContainers = Sets.newHashSet();
        Set<IRI> unknownObjects = Sets.newHashSet();
        Model testModel = Rio.parse(new StringReader(trigFile), "", RDFFormat.TRIG);
        List<LDPResource> ldpResources = api.importLDPResource(testModel, possibleContainers, Optional.empty(),
                unknownObjects, false, "");
        assertNull(ldpResources);

        /*
         * Containers initialized:
         * http://www.researchspace.org/resource/system/rootContainer
         * http://www.testcontainer.com
         */
        assertEquals(possibleContainers.size(), 2);

        /*
         * Only one object not present in empty initialized DB: foaf:Person
         */
        assertEquals(unknownObjects.size(), 1);
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testImportResourceContainerPresentAndDefinedAndForce() throws Exception {
        api.createLDPResource(Optional.of(LDPTestContainer.iriString),
                new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_CONTAINER_TTL), RDFFormat.TURTLE),
                RootContainer.IRI, "http://www.researchspace.org/testinstances/");

        Set<IRI> possibleContainers = Sets.newHashSet();
        Set<IRI> unknownObjects = Sets.newHashSet();
        Model testModel = Rio.parse(new StringReader(trigFile), "", RDFFormat.TRIG);
        LDPResource ldpResource = api.importLDPResource(testModel, possibleContainers,
                Optional.of(vf.createIRI("http://www.testcontainer.com")), unknownObjects, true,
                "http://www.testcontainer.com").get(0);
        assertNotNull(ldpResource);
    }
}
