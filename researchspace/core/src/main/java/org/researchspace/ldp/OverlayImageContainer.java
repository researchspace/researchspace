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

import java.nio.file.Paths;

import javax.inject.Inject;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.images.OverlayImageProcessor;
import org.researchspace.vocabulary.CRMdig;

import com.google.common.base.Strings;
import com.google.common.base.Throwables;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.DefaultLDPContainer;
import com.metaphacts.data.rdf.container.LDPR;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;

/**
 * This container holds overlayed images. From two source images it gets them from image server, blends to create
 * 3rd image, saves it into image server and provides appropriate metadata.
 * this container expects some initial information on blended image and provides some additional metadata.
 *
 *  Digital object 1 -> L21 -> D3 ;
 * Digital Object 2 -> L21 -> D3 ;
 * D3 -> L22 -> Digital Object 3
 *
 * could use to represent blending algorithm: D3 - rso:blendingType -> :scos-thesauri
 *
 * we need to preserve order and specify opacity, thus:
 *
 * D3 - L13_used_parameters -> arg1
 * arg1 - rdf:type - D1_Digital_Object
 * arg1 - rso:image Digital Object 2
 * arg1 - rso:order 1
 * arg1 - rso:opacity 0.4
 *
 * @author Yury Emelyanov
 */

@LDPR(iri= OverlayImageContainer.IRI_STRING)
public class OverlayImageContainer extends DefaultLDPContainer {
    
    @SuppressWarnings("unused")
    private static final Logger logger = LogManager.getLogger(OverlayImageContainer.class);

    public static final String IRI_STRING = "http://www.researchspace.org/ontology/OverlayImage.Container";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public static final String IIIF_PATH_PARAM = "iiifFolder";

    private OverlayImageProcessor overlayImageProcessor;

    @Inject
    private NamespaceRegistry ns;
    
    @Inject
    Configuration systemConfig;

    public OverlayImageContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    public void initialize() {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(IRI, RDF.TYPE, LDP.Resource));
            m.add(vf.createStatement(IRI, RDFS.LABEL, vf.createLiteral("Overlay Image Container")));
            m.add(vf.createStatement(IRI, RDFS.COMMENT,
                    vf.createLiteral("Container to store resources of rdf:type "+CRMdig.D35_AREA_CLASS))
                 );
            try {
                getRootContainer().add(new PointedGraph(IRI, m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }
    }

    private java.net.URI getIIIFFolder() throws RepositoryException {
        String iiifFolder = systemConfig.getEnvironmentConfig().getFileUploadLocation(IIIF_PATH_PARAM);
        try {
            if (Strings.isNullOrEmpty(iiifFolder))
                throw new Exception("Need to set " + IIIF_PATH_PARAM + " parameter to point to IIIF Image Server storage");
            java.net.URI iiifUri = new java.net.URI(iiifFolder);
            if (!Paths.get(iiifUri).toFile().exists())
                throw new Exception("Dir specified in " + IIIF_PATH_PARAM + " Does not exists");
            return iiifUri;
        } catch (Exception e) {
            throw new RepositoryException("Could not overlay images with iiif folder param " + IIIF_PATH_PARAM +
                "not set or invalid. It should point to directory with images form IIIF Image Server");
        }
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        return super.add(convertToCRMDig(pointedGraph));
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        super.update(convertToCRMDig(pointedGraph));
    }

    private PointedGraph convertToCRMDig(PointedGraph pointedGraph) throws RepositoryException {
        return getOverlayImageProcessor().convertToCRMDig(pointedGraph);
    }

    public OverlayImageProcessor getOverlayImageProcessor() throws RepositoryException {
        if (overlayImageProcessor == null) overlayImageProcessor = new OverlayImageProcessor(getIIIFFolder(), ns.getUserIRI());
        return overlayImageProcessor;
    }

    @Override
    public IRI getContextIRI() {
        // for image regions the contextURI i.e. URI of named graph must be equivalent to identifier of the region
        // that is if we use image regions as premises we point to the entire named graph
        return super.getContextIRI();
    }

}
