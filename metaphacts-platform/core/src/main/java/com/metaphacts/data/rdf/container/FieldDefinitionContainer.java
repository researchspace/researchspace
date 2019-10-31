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

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.PLATFORM;
import com.metaphacts.vocabulary.LDP;


/**
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
@LDPR(iri= FieldDefinitionContainer.IRI_STRING)
public class FieldDefinitionContainer extends DefaultLDPContainer {
    
    private static final Logger logger = LogManager.getLogger(FieldDefinitionContainer.class);

    public static final String IRI_STRING = "http://www.metaphacts.com/ontologies/platform#fieldDefinitionContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public FieldDefinitionContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public IRI getResourceType() {
        return PLATFORM.FIELD;
    }

    public void initialize() {
    	logger.debug("Initalizing form root container.");
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL,
                    vf.createLiteral("Field Definition Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT, vf.createLiteral("Container to store field definitions.")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        return super.add(pointedGraph);
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        super.update(pointedGraph);
    }

}
