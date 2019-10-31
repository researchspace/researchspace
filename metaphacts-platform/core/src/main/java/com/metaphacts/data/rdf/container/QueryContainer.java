/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.api.sparql.SparqlUtil;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;

@LDPR(iri = QueryContainer.IRI_STRING)
public class QueryContainer extends AbstractLDPContainer {
    public static final String IRI_STRING = "http://www.metaphacts.com/ontologies/platform#queryContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public QueryContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Query Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT, vf.createLiteral("Container to store sp:Query instances.")));

            getRootContainer().add(new PointedGraph(IRI, m));

        }
    }

    @Override
    public IRI getResourceType() {
        return SP.QUERY_CLASS;
    }

    @Override
    protected void add(PointedGraph pointedGraph, RepositoryConnection repConnection)
            throws RepositoryException {
        validateQuery(pointedGraph);
        super.add(pointedGraph, repConnection);
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        validateQuery(pointedGraph);
        super.update(pointedGraph);
    }
    
    protected void validateQuery(PointedGraph pointedGraph) throws IllegalArgumentException {
        
        Optional<String> optText = pointedGraph.getGraph().filter(null, SP.TEXT_PROPERTY, null)
                .stream()
                .map(Statement::getObject)
                .map(val -> val.stringValue())
                .findFirst();
                
        if (!optText.isPresent() || SparqlUtil.isEmpty(optText.get())) {
            throw new IllegalArgumentException("Cannot save an empty query");
        }

        String query = optText.get();
        try {
            SparqlOperationBuilder.create(query).validate();
        } catch (MalformedQueryException e) {
            throw new IllegalArgumentException("Syntax error in query: " + e.getMessage(), e);
        }
    }

}
