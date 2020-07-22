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

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

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
 * Singleton container for per-user {@link SetRootContainer} LDP containers.
 *
 * @see org.researchspace.rest.endpoint.SetManagementEndpoint
 * @see org.researchspace.templates.helper.SetManagementHelperSource
 * 
 * @author Alexey Morozov
 */
@LDPR(iri = UserSetRootContainer.IRI_STRING)
public class UserSetRootContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/userSetContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public UserSetRootContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public void initialize() {
        if (getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            return;
        }

        LinkedHashModel m = new LinkedHashModel();
        m.add(vf.createStatement(UserSetRootContainer.IRI, RDF.TYPE, LDP.Container));
        m.add(vf.createStatement(UserSetRootContainer.IRI, RDF.TYPE, LDP.Resource));
        m.add(vf.createStatement(UserSetRootContainer.IRI, RDFS.LABEL,
                vf.createLiteral("Container of users set containers")));
        try {
            getRootContainer().add(new PointedGraph(UserSetRootContainer.IRI, m));
        } catch (RepositoryException e) {
            throw Throwables.propagate(e);
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        if (pointedGraph.getGraph().filter(null, RDF.TYPE, SetRootContainer.IRI).subjects().isEmpty()) {
            Model m = pointedGraph.getGraph();
            m.add(vf.createStatement(pointedGraph.getPointer(), RDF.TYPE, SetRootContainer.IRI));
            pointedGraph.setGraph(m);
        }
        return super.add(pointedGraph);
    }

    public static String setContainerIriForUser(String username) {
        try {
            String encodedUsername = URLEncoder.encode(username, "UTF-8");
            return String.format("http://www.researchspace.org/resource/system/user/%s/setContainer", encodedUsername);
        } catch (UnsupportedEncodingException e) {
            throw Throwables.propagate(e);
        }
    }

    public static String defaultSetIriForUser(String username) {
        return setContainerIriForUser(username) + "/Uncategorized";
    }

    @Override
    public IRI getResourceType() {
        return vf.createIRI(IRI_STRING);
    }
}
