/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.data.rdf.container;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.vocabulary.LDP;

/**
 * Container for list of queries.
 * 
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com
 */
@LDPR(iri=QueryCatalogContainer.IRI_STRING)
public class QueryCatalogContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.metaphacts.com/ontologies/platform#queryCatalog";
    public static final IRI IRI = vf.createIRI(IRI_STRING);
    
    public QueryCatalogContainer(IRI uri, Repository repository) {
        super(uri, repository);
    }
    
    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Query Catalog Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT, vf.createLiteral("Container to store sp:Query instances.")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }
}