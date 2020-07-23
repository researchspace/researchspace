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

import javax.inject.Inject;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SPIN;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.cache.QueryTemplateCache;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;

import com.google.common.base.Throwables;

import java.util.Collections;

@LDPR(iri = QueryTemplateContainer.IRI_STRING)
public class QueryTemplateContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/queryTemplateContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    @Inject
    protected QueryTemplateCache queryTemplateCache;

    @Inject
    public QueryTemplateContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public IRI getResourceType() {
        return SPIN.TEMPLATE_CLASS;
    }

    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Query Template Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT,
                    vf.createLiteral("Container to store sp:QueryTemplate instances.")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    @Override
    public org.eclipse.rdf4j.model.IRI add(PointedGraph pointedGraph) throws RepositoryException {
        queryTemplateCache.invalidate(Collections.singleton(this.getResourceIRI()));
        return super.add(pointedGraph);
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        queryTemplateCache.invalidate(Collections.singleton(this.getResourceIRI()));
        super.update(pointedGraph);
    }

    @Override
    public void delete() throws RepositoryException {
        queryTemplateCache.invalidate(Collections.singleton(this.getResourceIRI()));
        super.delete();
    }

}
