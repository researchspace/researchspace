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

import java.util.Collections;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;

import com.google.common.collect.Sets;

/**
 * Representation of the platform root container.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@LDPR(iri = RootContainer.IRI_STRING)
public class RootContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/rootContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public RootContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    public RootContainer(MpRepositoryProvider repositoryProvider) {
        super(IRI, repositoryProvider);
    }

    @Override
    public Model getModel() throws RepositoryException {
        // we don't need to call super, since the root container does only exists
        // virtually
        Model m = new LinkedHashModel();
        m.add(this.getResourceIRI(), RDF.TYPE, LDP.Container);
        m.add(this.getResourceIRI(), RDFS.LABEL, vf.createLiteral("Platform Root Container"));
        // we get the membership relations from the repository i.e. they are not
        // stored in the root container context but being part of the individual
        // containers
        m.addAll(getReadConnection().getOutgoingStatements(this.getResourceIRI()));
        return m;
    }

    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(this.getResourceIRI(), RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(this.getResourceIRI(), RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(this.getResourceIRI(), RDFS.LABEL, vf.createLiteral("Root Container")));
            try (RepositoryConnection connection = getRepository().getConnection()) {
                connection.add(m, getContextIRI());
            }
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        if (!isLDPContainer(pointedGraph))
            throw new IllegalArgumentException("Only LDP Container can be added to the Platform Root Container");
        return super.add(pointedGraph);
    }

    private boolean isLDPContainer(PointedGraph pg) {
        return !Collections.disjoint(pg.getTypes(),
                Sets.newHashSet(LDP.Container, LDP.BasicContainer, LDP.DirectContainer));
    }

    @Override
    public void delete() throws RepositoryException {
        throw new IllegalArgumentException("Platform Root Container can not be deleted.");
    }

    @Override
    public IRI getResourceType() {
        return LDP.Container;
    }
}
