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

package com.metaphacts.rest.endpoint;

import java.io.InputStream;
import java.net.URL;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.function.Predicate;

import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.collect.Sets;
import com.google.inject.Injector;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.FileContainer;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.upload.MetadataExtractor;
import com.metaphacts.upload.UploadHandler;
import com.metaphacts.vocabulary.LDP;

/**
 * Simple fileupload
 *
 * Idea:
 * things to abstract in file upload:
 * 1) Uploaded file storage
 *  Developer should be able to define virtual storages in server's config and reuse them in components as targets.
 *  like 'upload-iiifFolder=file:///var/iiif' in environment.prop and storage 'iiifFolder' in upload component
 * 2) Resource url generation
 *  We need a resource to be created for uploaded file. We will use this resource in 2 places:
 *    a) in resource description
 *    b) in linked data container URI
 *  Right now it's a sparql select query for id generation,
 *  but this can be simplified to component parameter + random sequence
 * 3) Resource generation and creation of links
 * It's sparql parametrized construct query to create resource
 *
 * TODO: maybe redesign query parameters
 * Right now input parameters are provided for queries - ?__sequence__, ?__newId__, ?__contextUri__
 * that's a convention easy to miss and meybe should be revised
 *
 * @author Yury Emelyanov
 *
 */
@Path("")
public class FileUploadEndpoint {

    private static final String SEQUENCE = "__sequence__";
    private static final String NEW_ID = "__newId__";
    private static final String CONTEXT_URI = "__contextUri__";

    @Context
    private HttpServletRequest servletRequest;

    private static final Logger logger = LogManager.getLogger(FileUploadEndpoint.class.getName());

    private ValueFactory vf = SimpleValueFactory.getInstance();

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    com.metaphacts.config.Configuration systemConfig;

    @Inject
    private Injector injector;

    @Inject
    Set<UploadHandler> uploadHandlers;

    @POST
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response createDocument(
            @FormDataParam("createResourceQuery") String createResourceQuery,
            @FormDataParam("generateIdQuery") String generateIdQuery,
            @FormDataParam("storage") String storage,
            @FormDataParam("metadataExtractor") String metadataExtractor,
            @FormDataParam("contextUri") String contextUri,
            @FormDataParam("image") FormDataContentDisposition imageDisposition,
            @FormDataParam("image") InputStream in) throws Exception {
        if(logger.isTraceEnabled())
            logger.trace("Request to store image to resource with " + createResourceQuery);

        FileContainer fileContainer = (FileContainer) LDPImplManager.getLDPImplementation(FileContainer.IRI, Sets.newHashSet(LDP.Container, LDP.Resource), new MpRepositoryProvider(this.repositoryManager, RepositoryManager.ASSET_REPOSITORY_ID));//ldp.getLDPResource(FileContainer.URI);

        //generating random sequence
        String sequence = "" + nextLong();
        try {

            IRI newId;
            //generating new resource id
            try {
                newId = getGeneratedId(sequence, contextUri, generateIdQuery);
            } catch (Exception e) {
                throw new Exception("Error creating new id for uploaded file with context " + contextUri + ", sequence " + sequence + ":" + e.getMessage(), e);
            }

            PointedGraph ldpGraph;
            //creating resource data
            try {
                ldpGraph = processCreateResourceQuery(sequence, newId, createResourceQuery, contextUri);
            } catch (Exception e) {
                throw new Exception("Error creating resource data for uploaded file with context " + contextUri + ", sequence " + sequence + ":" + e.getMessage(), e);
            }

            //store file
            try {
                storeFile(sequence, storage, in);
            } catch (Exception e) {
                throw new Exception("Error storing new uploaded file with context " + contextUri + ", sequence " + sequence + ":" + e.getMessage(), e);
            }

            //todo: should we fail upload on failed metadata extraction? or just skip it?
            try {
                if (StringUtils.isNotEmpty(metadataExtractor)) {
                    MetadataExtractor metadataExtractorInstance = (MetadataExtractor) injector.getInstance(Class.forName(metadataExtractor));
                    if (metadataExtractorInstance != null) {
                        Model metadata = metadataExtractorInstance.extractMetadata(newId, ldpGraph.getGraph());
                        ldpGraph.getGraph().addAll(metadata);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to extract metadata for file with context " + contextUri + ", sequence " + sequence + ":" + e.getMessage());
                logger.debug("Details:" , e);
            }

            //adding resource to container
            fileContainer.add(ldpGraph);

            return Response.created(new java.net.URI(newId.toString())).build();

        } catch (Exception e) {
            logger.error("Failed to upload file with context " + contextUri + ", sequence " + sequence + ":" + e.getMessage());
            logger.debug("Details:" , e);
            return Response.serverError().entity(e.getMessage()).build();
        }finally{

        }
    }

    private IRI getGeneratedId(String sequence, String contextUri, String generateIdQuery) throws RepositoryException, MalformedQueryException, QueryEvaluationException {
        try(RepositoryConnection con = repositoryManager.getDefault().getConnection()){
            SparqlOperationBuilder<TupleQuery> operationBuilder = SparqlOperationBuilder.create(generateIdQuery, TupleQuery.class);
            TupleQuery op = operationBuilder.setBinding(SEQUENCE, vf.createLiteral(sequence))
                .setBinding(CONTEXT_URI, vf.createIRI(contextUri))
                .build(con);


            //TODO do some checks here and throw/log exceptions
            try(TupleQueryResult result = op.evaluate()) {
            	return vf.createIRI(QueryResults.asList(result).get(0).getBinding("newId").getValue().toString());
            }

        }


    }

    private void storeFile(String generatedId, String storage, InputStream in) throws Exception {
        final String uploadLocation = systemConfig.getEnvironmentConfig().getFileUploadLocation(storage);
        if (uploadLocation == null) {
            throw new IllegalArgumentException(
                "File storage " + storage + " is not available. upload-" + storage +
                " parameter is not defined in environment.props configuration file."
            );
        }

        final URL storageSpecifierUrl = new URL(uploadLocation);

        Optional<UploadHandler> uploadHandler = uploadHandlers.stream().filter(new Predicate<UploadHandler>() {
            @Override
            public boolean test(UploadHandler uploadHandler) {
                return uploadHandler.supportsProtocol(storageSpecifierUrl.getProtocol());
            }
        }).findFirst();

        if (uploadHandler.isPresent()) {
            uploadHandler.get().handleUpload(storageSpecifierUrl, generatedId, in);
        } else {
            throw new Exception("Cannot find handlers for upload URL" + storageSpecifierUrl.toString());
        }

    }

    private PointedGraph processCreateResourceQuery(String generatedId, IRI newId, String createResourceQuery, String contextUri) throws RepositoryException, MalformedQueryException, QueryEvaluationException {

        try(RepositoryConnection con = repositoryManager.getDefault().getConnection()){
            SparqlOperationBuilder<GraphQuery> operationBuilder = SparqlOperationBuilder.create(createResourceQuery, GraphQuery.class);
            GraphQueryResult result = operationBuilder.setBinding(SEQUENCE, vf.createLiteral(generatedId))
                .setBinding(CONTEXT_URI, vf.createIRI(contextUri))
                .setBinding(NEW_ID, newId)
                .build(con).evaluate();

            // asModel takes care of closing
             Model model = QueryResults.asModel(result);
             return new PointedGraph(newId, model);
        }


    }

    private Random r = new Random();

    private long nextLong() {
        long value;
        do {
            value = r.nextLong();
        } while  (value < 0);
        return value;
    }

}
