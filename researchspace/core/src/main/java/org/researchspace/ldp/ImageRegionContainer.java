/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

package org.researchspace.ldp;

import java.util.Date;
import java.util.Optional;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.vocabulary.CRMdig;
import org.researchspace.vocabulary.CidocCRM;
import org.researchspace.vocabulary.RSO;

import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.DefaultLDPContainer;
import com.metaphacts.data.rdf.container.LDPR;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;
import com.metaphacts.vocabulary.OA;

/**
 * @author Yury Emelyanov
 */
@LDPR(iri=ImageRegionContainer.IRI_STRING)
public class ImageRegionContainer extends DefaultLDPContainer {
    private static final Logger logger = LogManager.getLogger(ImageRegionContainer.class);

    public static final String IRI_STRING = "http://www.researchspace.org/ontology/ImageRegions.Container";
    public static final IRI IRI  = vf.createIRI(IRI_STRING);

    public ImageRegionContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    public void initialize() {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL,
                    vf.createLiteral("Image Region Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT,
                    vf.createLiteral("Container to store resources of rdf:type "+CRMdig.D35_AREA_CLASS)));
            try {
                getRootContainer().add(new PointedGraph(getResourceIRI(), m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        return super.add(convertToCRMdig(pointedGraph));
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        super.update(convertToCRMdig(pointedGraph));
    }

    private PointedGraph convertToCRMdig(PointedGraph graph) {

        IRI  regionUri = graph.getPointer();

        Model oldModel = graph.getGraph();
        Model newModel = new LinkedHashModel();

        //add RS specific type for image region
        newModel.add(regionUri, RDF.TYPE, RSO.EX_DIGITAL_IMAGE_REGION_CLASS);
        // what RS calls region is a CRMdig D35 Area
        newModel.add(regionUri, RDF.TYPE, CRMdig.D35_AREA_CLASS);
        // a region is at the same time rso:Thing
        newModel.add(vf.createStatement(regionUri, RDF.TYPE, RSO.THING_CLASS));

        // in Mirador the area is actually the selector
        Optional<Literal> svgContent = Models.subject(oldModel.filter(null, RDF.TYPE, OA.SVG_SELECTOR_CLASS))
            .flatMap((Resource svgSelector) -> Models.objectLiteral(
                oldModel.filter(svgSelector, RDF.VALUE, null)));

        if (svgContent.isPresent()) {
            newModel.add(regionUri, RDF.VALUE, svgContent.get());
        }

        // transfer rdfs:label and add them as rso:displayLabel
        Model labels = graph.getGraph().filter(regionUri, RDFS.LABEL, null);
        newModel.addAll(labels);
        for(Statement labelStmt : labels) {
            newModel.add(
                    vf.createStatement(labelStmt.getSubject(), RSO.DISPLAYLABEL_PROPERTY, labelStmt.getObject())
            );
        }

        // region/area is propagated area of D9 Data Object
        IRI  regionDataObjectUri = vf.createIRI(regionUri.stringValue()+"/dataobject");
        newModel.add(regionUri, CRMdig.L50_IS_PROPAGATED_AREA_OF_PROPERTY, regionDataObjectUri);

        // create the digital machine event
        IRI  eventImpl = vf.createIRI(regionUri.stringValue() + "/event");
        newModel.add(eventImpl, RDF.TYPE, CRMdig.D7_DIGITAL_MACHINE_EVENT_CLASS);
        newModel.add(eventImpl, CRMdig.L11_HAD_OUTPUT_PROPERTY, regionDataObjectUri);
        IRI  timespanImpl = vf.createIRI(eventImpl.stringValue() + "/time");
        newModel.add(eventImpl, CidocCRM.P4_HAS_TIME_SPAN_PROPERTY, timespanImpl);
        newModel.add(timespanImpl, RDF.TYPE, CidocCRM.E52_TIME_SPAN_CLASS);
        newModel.add(timespanImpl, CidocCRM.P82A_BEGIN_OF_THE_BEGIN_PROPERTY, vf.createLiteral(new Date()));
        newModel.add(timespanImpl, CidocCRM.P82A_END_OF_THE_END_PROPERTY, vf.createLiteral(new Date()));

        // add information about who created the region
        newModel.add(eventImpl, CidocCRM.P14_CARRIED_OUT_BY_PROPERTY, ns.getUserIRI());
        newModel.add(ns.getUserIRI(), RDF.TYPE, CidocCRM.E39_ACTOR_CLASS);


        Models.objectResource(oldModel.filter(null, OA.HAS_SOURCE_PROPERTY, null)).<Resource>map(
             (Resource imageUri) -> {
                // the region is L49 primary area of some D9 data object (the original image)
                newModel.add(regionUri, CRMdig.L49_IS_PRIMARY_AREA_OF_PROPERTY, imageUri);

                // re-create context: the image must have been created at some point in time
                IRI  digiProcess = vf.createIRI(imageUri.stringValue()+"/digiprocess");
                newModel.add(digiProcess, CRMdig.L20_HAS_CREATED_PROPERTY, imageUri);

                getMainRepesentationFromRepository(imageUri).map(
                   (IRI mainRepresentaitonUri) -> newModel.add(digiProcess, CRMdig.L1_DIGITIZED_PROPERTY, mainRepresentaitonUri)
                   );

                return imageUri;
             });

        // add (proprietary) viewport and bounding-box information
        IRI  viewportProperty = vf.createIRI(RSO.NAMESPACE.concat("viewport"));
        Models.objectLiteral(oldModel.filter(null, viewportProperty, null)).map(
            (Literal viewport) -> newModel.add(regionUri, viewportProperty, viewport)
        );

        Models.subject(oldModel.filter(null, RDF.TYPE, OA.FRAGMENT_SELECTOR_CLASS))
            .flatMap((Resource fragmentSelector) -> Models.objectLiteral(
                oldModel.filter(fragmentSelector, RDF.VALUE, null)))
            .ifPresent(boundingBox -> {
                IRI boundingBoxProperty = vf.createIRI(RSO.NAMESPACE.concat("boundingBox"));
                newModel.add(regionUri, boundingBoxProperty, boundingBox);
            });

        return new PointedGraph(regionUri, newModel);
    }

    private Optional<IRI> getMainRepesentationFromRepository(Resource imageURI) {
        try {
           return Models.subjectIRI(getReadConnection().getStatements(null, CidocCRM.P138i_HAS_REPRESENTATION_PROPERTY, imageURI));
        } catch (ModelException | RepositoryException e) {
            logger.warn("No P138i_has_representation exists for image: "+ imageURI);
            return Optional.<IRI>empty();
        }
    }


    @Override
    public IRI getContextIRI() {
        // for image regions the contextURI i.e. IRI  of named graph must be equivalent to identifier of the region
        // that is if we use image regions as premises we point to the entire named graph
        return super.getContextIRI();
    }

}
