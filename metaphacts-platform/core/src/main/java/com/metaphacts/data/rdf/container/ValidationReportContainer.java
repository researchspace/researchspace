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
import java.util.Date;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;
import com.metaphacts.vocabulary.PLATFORM;
import com.metaphacts.vocabulary.PROV;
import com.metaphacts.vocabulary.SHACL;

@LDPR(iri = ValidationReportContainer.IRI_STRING)
public class ValidationReportContainer extends DefaultLDPContainer {
    public static final String IRI_STRING = "http://www.metaphacts.com/ontologies/platform#validationReportContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public ValidationReportContainer(IRI uri, MpRepositoryProvider repositoryProvider) {
        super(uri, repositoryProvider);
    }

    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Validation Report Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT, vf.createLiteral("Container to store SHACL validation reports")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }
    
    @Override
    protected PointedGraph addProvenance(PointedGraph pg) {
        Model m = pg.getGraph();
        m.add(pg.getPointer(), RDF.TYPE, PROV.Entity);
        // ValidationReports are saved asynchronously, so there is no session with user
        // for now we can attribute them to system user
        // TODO rethink attributions for asynchronous jobs
        m.add(pg.getPointer(), PROV.wasAttributedTo, PLATFORM.SYSTEM_USER_INDIVIDUAL);
        m.add(pg.getPointer(), PROV.generatedAtTime, vf.createLiteral(new Date()));
        pg.setGraph(m);
        return pg;
    }

    @Override
    public IRI getResourceType() {
        return SHACL.ValidationReport;
    }
}
