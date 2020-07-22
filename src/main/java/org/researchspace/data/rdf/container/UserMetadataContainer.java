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
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;

import com.google.common.base.Throwables;

/**
 * Container for list of user names and roles retrieved from LDAP.
 * 
 * @author Denis Ostapenko
 */
@LDPR(iri = UserMetadataContainer.URI_STRING)
public class UserMetadataContainer extends DefaultLDPContainer {

    public static final String URI_STRING = "http://www.researchspace.org/resource/system/userMetadataContainer";
    public static final String URI_ROOT_STRING = "http://www.researchspace.org/resource/system/userMetadata";
    public static final IRI IRI = vf.createIRI(URI_STRING);
    public static final IRI IRI_ROOT = vf.createIRI(URI_ROOT_STRING);

    public UserMetadataContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public void initialize() {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("User Metadata Container")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        update(pointedGraph);
        return pointedGraph.getPointer();
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        Model model = pointedGraph.getGraph();
        model.add(IRI_ROOT, RDF.TYPE, UserMetadataResource.URI);
        PointedGraph newGraph = new PointedGraph(IRI_ROOT, model);
        try {
            super.update(newGraph);
        } catch (LDPResourceNotFoundException e) {
            // Trying to update not existing yet singleton container
            super.add(newGraph);
        }
    }
}
