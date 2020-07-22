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

import java.util.Date;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.PLATFORM;
import org.researchspace.vocabulary.PROV;
import org.researchspace.vocabulary.SHACL;

import com.google.common.base.Throwables;

@LDPR(iri = ValidationReportContainer.IRI_STRING)
public class ValidationReportContainer extends DefaultLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/validationReportContainer";
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
            m.add(vf.createStatement(IRI, RDFS.COMMENT,
                    vf.createLiteral("Container to store SHACL validation reports")));
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
