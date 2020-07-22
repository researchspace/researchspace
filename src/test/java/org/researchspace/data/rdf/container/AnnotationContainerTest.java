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
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.junit.Test;
import org.researchspace.data.rdf.container.AnnotationContainer;
import org.researchspace.data.rdf.container.LDPContainer;
import org.researchspace.data.rdf.container.LDPResource;
import org.researchspace.data.rdf.container.RDFStream;
import org.researchspace.data.rdf.container.RootContainer;
import org.researchspace.junit.TestUtils;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.OA;

import com.github.sdorra.shiro.SubjectAware;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class AnnotationContainerTest extends AbstractLDPTest {
    private static final String ANNOTATION_RESOURCE_TTL = "/org/researchspace/data/rdf/container/annotationResource.ttl";
    private static final String ANNOTATION_RESOURCE_UPDATED_TTL = "/org/researchspace/data/rdf/container/annotationResourceUpdated.ttl";
    private static final String ANNOTATION_RESOURCE_WITHOUTBODY_TTL = "/org/researchspace/data/rdf/container/annotationResourceWithoutBody.ttl";
    private static final String ANNOTATION_RESOURCE_WITHOUTTYPE_TTL = "/org/researchspace/data/rdf/container/annotationResourceWithoutType.ttl";

    private static final IRI annotationResource = vf.createIRI("http://www.test.com/annotation1");

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testAddAnnotation() throws Exception {
        LDPResource res = api.createLDPResource(Optional.of(annotationResource.stringValue()),
                new RDFStream(TestUtils.readPlainTextTurtleInput(ANNOTATION_RESOURCE_TTL), RDFFormat.TURTLE),
                AnnotationContainer.IRI, "http://www.researchspace.org/testinstances/");
        assertEquals(AnnotationContainer.IRI, res.getParentContainer());

        LDPResource cnt = api.getLDPResource(AnnotationContainer.IRI);
        assertTrue(cnt instanceof LDPContainer);
        assertTrue(cnt instanceof AnnotationContainer);

        assertEquals(RootContainer.IRI, cnt.getParentContainer());

        // the container will be initialized
        assertTrue(connection().hasStatement(AnnotationContainer.IRI, RDF.TYPE, LDP.Container));
        assertTrue(connection().hasStatement(AnnotationContainer.IRI, RDFS.LABEL,
                vf.createLiteral("Annotations Container")));

        // assert that the URI for the body resource has automatically been replaced
        java.util.Optional<IRI> bodyURI = Models
                .objectIRI(res.getModel().filter(res.getResourceIRI(), OA.HAS_BODY_PROPERTY, null));
        assertNotEquals(SimpleValueFactory.getInstance().createIRI("http://example.org/Annotation"), bodyURI.get());
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testAddAnnotationWithoutBody() throws Exception {
        exception.expect(NullPointerException.class);
        exception.expectMessage(containsString("Annotation must have a body"));
        api.createLDPResource(Optional.of(annotationResource.stringValue()),
                new RDFStream(TestUtils.readPlainTextTurtleInput(ANNOTATION_RESOURCE_WITHOUTBODY_TTL),
                        RDFFormat.TURTLE),
                AnnotationContainer.IRI, "http://www.researchspace.org/testinstances/");
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = sparqlPermissionShiroFile // TODO
    )
    public void testAddAnnotationWithoutType() throws Exception {
        exception.expect(IllegalArgumentException.class);
        exception.expectMessage(containsString(
                "Resource to be added to the Annotation Container must be at least of rdf:type oa:Annotation."));
        api.createLDPResource(Optional.of(annotationResource.stringValue()),
                new RDFStream(TestUtils.readPlainTextTurtleInput(ANNOTATION_RESOURCE_WITHOUTTYPE_TTL),
                        RDFFormat.TURTLE),
                AnnotationContainer.IRI, "http://www.researchspace.org/testinstances/");
    }

}
