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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.data.rdf.ReadConnection;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.CidocCRM;

import com.google.common.base.Throwables;

/**
 * @author Yury Emelyanov
 */
@LDPR(iri = OntodiaDiagramContainer.IRI_STRING)
public class OntodiaDiagramContainer extends DefaultLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/ontodiaDiagramContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public OntodiaDiagramContainer(IRI uri, MpRepositoryProvider repositoryProvider) {
        super(uri, repositoryProvider);
    }

    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Ontodia Diagram Container")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    /**
     * A diagram is stored in a graph named after its IRI, and deleting or updating the diagram
     * clears that graph. A new diagram therefore gets only an IRI that does not name anything
     * yet: the IRI may come from a slug, i.e. from the name a user typed or from an imported file.
     */
    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        IRI resource = pointedGraph.getPointer();
        IRI context = new DefaultLDPResource(resource, this.repositoryProvider).getContextIRI();
        ReadConnection read = getReadConnection();
        if (read.hasOutgoingStatements(resource) || read.hasStatement(null, null, null, context)) {
            throw new IllegalArgumentException(
                    "The IRI is already used by another resource: " + resource.stringValue());
        }
        return super.add(pointedGraph);
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        super.update(pointedGraph);
    }

}
