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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.vocabulary.CRMdig;
import org.researchspace.vocabulary.CidocCRM;

import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.AnnotationContainer;
import com.metaphacts.data.rdf.container.LDPR;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;
import com.metaphacts.vocabulary.OA;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@LDPR(iri=AnnotationsContainer.IRI_STRING)
public class AnnotationsContainer extends AnnotationContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/ontology/Annotations.Container";
    public static final IRI IRI = vf.createIRI(IRI_STRING);
    
    
    public AnnotationsContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }
    
    public void initialize() {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL,vf.createLiteral("Annotations Container")));
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }
    
    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        return super.add(this.addCidocMetadata(pointedGraph));
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        super.update(this.addCidocMetadata(pointedGraph));
    }
    
    private PointedGraph addCidocMetadata(PointedGraph pointedGraph){
        Model model = pointedGraph.getGraph();
        
        IRI annotation = pointedGraph.getPointer();
        
        // add crmdig:D29_Anntation_Object typing
        model.add(annotation, RDF.TYPE , CRMdig.D29_ANNOTATION_OBJECT_CLASS);
        
        // add crmdig:L43_annotates relation
        Models.objectResource(model.filter(null, OA.HAS_TARGET_PROPERTY, null)).map( 
                (Resource target) ->  model.add(annotation, CRMdig.L43_ANNOTATES_PROPERTY, target)
        );
        
        // add crmdig:L43_created_annotation relation from annotation event to annotation
        IRI annotationEvent = vf.createIRI(annotation.stringValue()+"/event");
    
        model.add(annotationEvent,CRMdig.L48_CREATED_ANNOTATION_PROPERTY, annotation);
        
        // who carried out the event
        model.add(annotationEvent, CidocCRM.P14_CARRIED_OUT_BY_PROPERTY, ns.getUserIRI());
        
        // timespan
        Literal dateLit = vf.createLiteral(new Date());
        IRI timeSpan = vf.createIRI(annotationEvent.stringValue() + "/timespan");
        model.add(annotationEvent, CidocCRM.P4_HAS_TIME_SPAN_PROPERTY, timeSpan);
        model.add(timeSpan, RDF.TYPE, CidocCRM.E52_TIME_SPAN_CLASS);
        model.add(timeSpan, CidocCRM.P82A_BEGIN_OF_THE_BEGIN_PROPERTY, dateLit);
        model.add(timeSpan, CidocCRM.P82A_END_OF_THE_END_PROPERTY, dateLit);
        

       return new PointedGraph(pointedGraph.getPointer(), model);
    }
    
}