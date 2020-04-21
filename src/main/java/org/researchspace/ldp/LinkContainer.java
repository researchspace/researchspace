/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.ldp;

import javax.inject.Inject;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.data.rdf.container.AbstractLDPContainer;
import org.researchspace.data.rdf.container.LDPR;
import org.researchspace.data.rdf.container.RootContainer;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.CRMdig;
import org.researchspace.vocabulary.LDP;

import com.google.common.base.Throwables;
import com.google.inject.Provider;

/**
 * LDP container for researchspace AnnotationObject aka Link.
 *
 * As required in ResearchSpace IA iteration 3, user should be able to annotate
 * multiple resources with one annotation. It is used to indicate that there is
 * some relations between objects, and user can elaborate on this relation
 * 'annotating' this linked object.
 *
 * According to ResearchSpace requirements things are linked together with
 * crmidg:L43_annotates predicate.
 * 
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@LDPR(iri = LinkContainer.IRI_STRING)
public class LinkContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/ontology/Link.Container";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    @Inject
    private Provider<RootContainer> rootContainer;

    public LinkContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public void initialize() {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Link Container")));
            try {
                rootContainer.get().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    @Override
    public IRI getResourceType() {
        return CRMdig.D29_ANNOTATION_OBJECT_CLASS;
    }
}