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

package com.metaphacts.rest.endpoint;

import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.OPTIONS;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.EntityTag;
import javax.ws.rs.core.Link;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.commonjava.mimeparse.MIMEParse;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.RDFWriterRegistry;
import org.eclipse.rdf4j.rio.Rio;
import org.glassfish.jersey.message.internal.JerseyLink.Builder;

import com.google.common.base.Charsets;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.container.AbstractLDPContainer;
import com.metaphacts.data.rdf.container.LDPApi;
import com.metaphacts.data.rdf.container.LDPResource;
import com.metaphacts.data.rdf.container.LDPResourceNotFoundException;
import com.metaphacts.data.rdf.container.RDFStream;
import com.metaphacts.data.rdf.container.RootContainer;
import com.metaphacts.data.rdf.RioUtils;
import com.metaphacts.repository.RepositoryManager;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Path("")
public class ContainerEndpoint {

    private static final Logger logger = LogManager.getLogger(ContainerEndpoint.class);

    private static final Set<String> supportedResourceOperations = Sets.newHashSet("GET, DELETE", "PUT");
    private static final Set<String> supporteContainerOperations = Sets.newHashSet("GET", "DELETE", "PUT", "POST");

    @Context
    private UriInfo uriInfo;

    @Inject
    private NamespaceRegistry ns;

    @Context
    private Request req;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private RioUtils rioUtils;

    @Inject
    private Configuration config;

    private static final Cache<Repository, LDPApi> ldp = CacheBuilder.newBuilder()
            .maximumSize(5).expireAfterAccess(30, TimeUnit.MINUTES)
            .build();

    @POST
    @RequiresAuthentication
    public Response createResource(
            @DefaultValue(RootContainer.IRI_STRING) @QueryParam("uri") IRI uri,
            InputStream in,
            @HeaderParam("Slug") Optional<String> slug,
            @HeaderParam("Content-Type") String contentType,
            @QueryParam("repository") String repositoryID
            ) throws RDFParseException,
            RDFHandlerException, IOException, RepositoryException {

        if(logger.isTraceEnabled())
            logger.trace("Request to create a new LDP resource with slug: "+slug.orElse("NO SLUG"));

        LDPResource ldpResource;
        try{
            java.util.Optional<RDFFormat> format = Rio.getParserFormatForMIMEType(contentType);
            if (!format.isPresent()) return Response.status(Status.UNSUPPORTED_MEDIA_TYPE).build();
            ldpResource = api(repositoryID).createLDPResource(slug, new RDFStream(in, format.get()), uri, getBaseUri());
        }catch(Exception e){
            logger.error("Failed to create new LDP resource with suggested slug \""+ slug.orElse("NO SLUG") +"\": "+e.getMessage());
            logger.debug("Details:" , e);
            return Response.serverError().entity(e.getMessage()).build();
        }
        return Response
                .created(java.net.URI.create(ldpResource.getResourceIRI().stringValue()))
                .links(generateLinks(ldpResource.getLDPTypes()))
                .build();

    }

    @GET
    @Path("/copyResource")
    @RequiresAuthentication
    public Response copyResource(
        @QueryParam("source") IRI uri,
        @QueryParam("target") Optional<IRI> targetContainer,
        @HeaderParam("Slug") Optional<String> slug,
        @QueryParam("repository") String repositoryID
    ) throws RepositoryException {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to copy LDP resource " + uri.stringValue() + " with slug " + slug.orElse("NO SLUG"));
        }
        LDPResource ldpResource;
        try {
            ldpResource = api(repositoryID).copyLDPResource(slug, uri, targetContainer, getBaseUri());
        } catch (Exception e) {
            logger.error("Failed to copy LDP resource " + uri + " with slug " + slug.orElse("NO SLUG") + ": " + e.getMessage());
            logger.debug("Details: ", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
        return Response.created(java.net.URI.create(ldpResource.getResourceIRI().stringValue())).build();
    }


    private final static RDFFormat ExportImportFormat = RDFFormat.TRIG;
    private final static int DelayedImportRequestCacheLifeMs = 15 * 60 * 1000;
    private final static int DelayedImportRequestCacheKeyLength = 32;

    @GET
    @Path("/exportResource")
    @RequiresAuthentication
    @Produces("application/x-trig")
    public Response exportResource(
        @QueryParam("iris") List<IRI> iris,
        @DefaultValue(RepositoryManager.ASSET_REPOSITORY_ID) @QueryParam("repository") String repositoryID
    ) throws RepositoryException {
        if (logger.isTraceEnabled()) {
            List<String> iriStrings = iris.stream().map((IRI iri) -> iri.stringValue()).collect(Collectors.toList());
            logger.trace("Request to export LDP resources " + String.join(", ", iriStrings));
        }
        try {
            Model exportedModel = api(repositoryID).exportLDPResource(iris);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            rioUtils.write(ExportImportFormat, exportedModel, out);
            return Response.ok(out.toByteArray())
                .header("Content-Disposition", "attachment; filename=\"export.trig\"")
                .build();
        } catch (Exception e) {
            logger.error("Failed to export LDP resources: " + e.getMessage());
            logger.debug("Details: ", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }


    private class DelayedImportRequest {
        Model resource;
        long requestTime;
        DelayedImportRequest(Model resource) {
            this.resource = resource;
            this.requestTime = System.currentTimeMillis();
        }
    }
    // ToFix: move it to server singleton, ContainerEndpoint id differs between requests
    private static Map<String, DelayedImportRequest> delayedImportRequestSet = new LinkedHashMap<>();

    public class DelayedImportResponse {
        public String delayedImportRequestId = RandomStringUtils.randomAlphanumeric(DelayedImportRequestCacheKeyLength);
        public Set<IRI> possibleContainers = Sets.newHashSet();
        public Set<IRI> unknownObjects = Sets.newHashSet();
    }

    @POST
    @Path("/importResource")
    @RequiresAuthentication
    @Produces("application/json")
    public Response importResource(
        @QueryParam("force") @DefaultValue("false") boolean force,
        @QueryParam("containerIRI") Optional<IRI> containerIRI,
        @QueryParam("delayedId") Optional<String> delayedId,
        @DefaultValue(RepositoryManager.ASSET_REPOSITORY_ID) @QueryParam("repository") String repositoryID,
        InputStream in
    ) throws IOException {

        logger.trace("Request to import LDP resource into " + containerIRI.toString() +
            " force=" + String.valueOf(force) + " delayedId=" + delayedId.toString()
        );

        long currentTime = System.currentTimeMillis();
        for (String id : delayedImportRequestSet.keySet()) {
            if (currentTime - delayedImportRequestSet.get(id).requestTime > DelayedImportRequestCacheLifeMs) {
                delayedImportRequestSet.remove(id);
            }
        }

        try {
            Model resource;
            if (delayedId.isPresent()) {
                resource = delayedImportRequestSet.get(delayedId.get()).resource;
            } else {
                resource = rioUtils.parse(in, "", ExportImportFormat);
            }

            DelayedImportResponse response = new DelayedImportResponse();
            List<LDPResource> ldpResources = api(repositoryID).importLDPResource(
                resource,
                response.possibleContainers, containerIRI,
                response.unknownObjects, force,
                uriInfo.getBaseUri().toString());
            if (ldpResources == null) {
                if (delayedId.isPresent()) {
                    response.delayedImportRequestId = delayedId.get();
                } else {
                    delayedImportRequestSet.put(response.delayedImportRequestId, new DelayedImportRequest(resource));
                }
                return Response.status(Status.ACCEPTED).entity(response).build();
            } else if (delayedId.isPresent()) {
                delayedImportRequestSet.remove(delayedId.get());
            }
            return Response.created(java.net.URI.create(ldpResources.get(0).getResourceIRI().stringValue())).build();
        } catch (Exception e) {
            logger.error("Exception while import LDP resource: " + e.getMessage());
            logger.debug("Details: ", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }


    @GET
    @RequiresAuthentication
    public Response getResource(
        @DefaultValue(RootContainer.IRI_STRING) @QueryParam("uri") IRI uri,
        @HeaderParam("Accept") String acceptTypes,
        @QueryParam("repository") String repositoryID
    ) throws Exception {
        if(logger.isTraceEnabled()) {
            logger.trace("Request to return LDP resource: "+ uri);
        }

        try{
            LDPResource ldpResource = api(repositoryID).getLDPResource(uri);
            final Model m = ldpResource.getModel();
            CacheControl cc = new CacheControl();
            cc.setPrivate(true); // should not be cached by proxy etc
            Response.ResponseBuilder rb = null;

            // TODO find a faster entity tag
            EntityTag etag = new EntityTag(String.valueOf(m.hashCode()));

            // TODO think of lastModification date precondition i.e. using provenance time of the
            // container, which we save anyway

            rb = req.evaluatePreconditions(etag);

            if (rb != null) {
                logger.debug("Returning 304: Container {} with eTag {} seems to be cached by browser.", uri, etag.getValue());
                return rb.cacheControl(cc).build();
            }

            // TODO boilerplate, need to be re-factored as soon as re-factoring SparqlServlet
            List<String> possibleMimeTypes = Lists.newArrayList();
            for(RDFFormat f : RDFWriterRegistry.getInstance().getKeys()){
                possibleMimeTypes.add(f.getDefaultMIMEType());
            }

            final String preferredMimeType = MIMEParse.bestMatch(possibleMimeTypes, acceptTypes);

            Optional<RDFFormat> formatGuess = Rio.getParserFormatForMIMEType(preferredMimeType);
            final RDFFormat format = formatGuess.orElse(RDFFormat.TURTLE);

            StreamingOutput stream = new StreamingOutput() {
                @Override
                public void write(OutputStream os) throws IOException, WebApplicationException {
                    Writer writer = new BufferedWriter(new OutputStreamWriter(os, Charsets.UTF_8));
                    for(Map.Entry<String, String> e : ns.getPrefixMap().entrySet())
                        m.setNamespace(e.getKey(),e.getValue());
                    try {
                        Rio.write(m, writer, format);
                    } catch (RDFHandlerException e) {
                        throw new WebApplicationException(e);
                    }
                    writer.flush();
                }
            };

            // tell the client that the response is stale
            // setting both "Cache-Control: max-age=0, must-revalidate" and "Cache-Control: no-cache" due to different browser interpretations
            // c.f. http://stackoverflow.com/questions/1046966/whats-the-difference-between-cache-control-max-age-0-and-no-cache
            //  SHOULD revalidate the response
            cc.setMaxAge(0);
            cc.setMustRevalidate(true);
            // MUST revalidate
            cc.setNoCache(true);

            return Response.ok(stream, format.getDefaultMIMEType())
                    .links(generateLinks(ldpResource.getLDPTypes()))
                    .cacheControl(cc)
                    .tag(etag)
                    .allow(ldpResource.isContainer() ? supporteContainerOperations : supportedResourceOperations)
                    .build();

        }catch(Exception e){
            logger.error("Failed to return LDP resource resource \""+ uri +"\" :"+e.getMessage());
            logger.debug("Details:" , e);
            if(e instanceof LDPResourceNotFoundException){
                return Response.status(Status.NOT_FOUND).entity(e.getMessage()).build();
            }else{
                return Response.serverError().entity(e.getMessage()).build();
            }
        }
    }

    @DELETE
    @RequiresAuthentication
    public Response delete(@QueryParam("uri") IRI uri, @QueryParam("repository") String repositoryID) throws RepositoryException {
        if(logger.isTraceEnabled())
            logger.trace("Request to delete collection or item: "+ uri);

        try{
            api(repositoryID).deleteLDPResource(uri);
        }catch(Exception e){
            logger.error("Failed to delete LDP resource \""+ uri +"\": "+e.getMessage());
            logger.debug("Details:" , e);
            return Response.serverError().entity(e.getMessage()).build();
        }
        return Response.ok().build();
    }

    @PUT
    @RequiresAuthentication
    public Response updateResource(@QueryParam("uri") IRI uri, InputStream in, @HeaderParam("Content-Type") String contentType, @QueryParam("repository") String repositoryID) throws RDFParseException,
    RDFHandlerException, IOException, RepositoryException{
        if(logger.isTraceEnabled())
            logger.trace("Request to update LDP resource with URI: "+uri);

        LDPResource ldpResource = null;
        try{
            java.util.Optional<RDFFormat> format = Rio.getParserFormatForMIMEType(contentType);
            if (!format.isPresent()) return Response.status(Status.UNSUPPORTED_MEDIA_TYPE).build();
            ldpResource = api(repositoryID).updateLDPResource(new RDFStream(in, format.get()), uri);
        }catch(Exception e){
            logger.error("Failed to update LDP resource \""+ uri +"\": "+e.getMessage());
            logger.debug("Details:" , e);
            return Response.serverError().entity(e.getMessage()).build();
        }

        return Response
                .created(java.net.URI.create(ldpResource.getResourceIRI().stringValue()))
                .links(generateLinks(ldpResource.getLDPTypes())).build();
    }

    @PUT
    @Path("/rename")
    @RequiresAuthentication
    public Response renameResource(
        @QueryParam("uri") IRI uri,
        @QueryParam("newName") String newName,
        @QueryParam("repository") String repositoryID
    ) {
        LDPResource resource;
        try {
            LDPApi ldp = api(repositoryID);
            resource = ldp.getLDPResource(uri);
            AbstractLDPContainer parent = (AbstractLDPContainer)ldp.getLDPResource(resource.getParentContainer());
            parent.rename(uri, newName);
            return Response
                .created(java.net.URI.create(resource.getResourceIRI().stringValue()))
                .links(generateLinks(resource.getLDPTypes())).build();
        } catch (Exception ex) {
            if (ex instanceof LDPResourceNotFoundException) {
                return Response.status(Status.NOT_FOUND).entity(ex.getMessage()).build();
            } else {
                return Response.serverError().entity(ex.getMessage()).build();
            }
        }
    }

    @OPTIONS
    @RequiresAuthentication
    public Response getOptions(@DefaultValue(RootContainer.IRI_STRING) @QueryParam("uri") IRI uri, @QueryParam("repository") String repositoryID) throws Exception{
        Set<String> operations;
        try{
            operations = api(repositoryID).getLDPResource(uri).isContainer() ? supporteContainerOperations : supportedResourceOperations;
        }catch(Exception e){
            if(e instanceof LDPResourceNotFoundException)
                return Response.status(Status.NOT_FOUND).entity(e.getMessage()).build();
            else
                return Response.serverError().entity(e.getMessage()).build();
        }

        if (uri.equals(RootContainer.IRI))
            operations = Sets.newHashSet("GET","POST");
        return  Response.ok().header("Allow-Control-Allow-Methods", operations).build();
    }

    private String getBaseUri(){
        String platformBaseIri = config.getEnvironmentConfig().getPlatformBaseIri();
        if(!StringUtils.isEmpty(platformBaseIri)){
            return platformBaseIri;
        }
        return uriInfo.getBaseUri().toString();
    }

    /**
     * Generate links for post creation info i.e. http://www.w3.org/TR/ldp/#ldpc-post-rdfnullrel
     * @param set
     * @return
     */
    private Link[] generateLinks(Set<IRI> set){
        List<Link>links = Lists.newArrayList();
        for(IRI r : set){
            links.add(new Builder().rel("type").uri(r.stringValue()).build(new Object[]{}));
        }
        return links.toArray(new Link[]{});
    }

    private LDPApi api(String repositoryID) throws ExecutionException{
        final String repID = Optional.ofNullable(repositoryID).orElse(RepositoryManager.ASSET_REPOSITORY_ID);
        final Repository rep = repositoryManager.getRepository(
                repID
        );

        return ldp.get(rep, new Callable<LDPApi>() {
            @Override
            public LDPApi call() {
                logger.debug("Creating new LDPApi instance for repository \"{}\".", repID);
                return new LDPApi(rep);
            }
        });
    }

}
