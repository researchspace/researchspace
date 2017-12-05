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

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.zip.ZipOutputStream;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.http.HttpServletResponse;
import javax.validation.constraints.NotNull;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.EntityTag;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;

import com.metaphacts.templates.*;
import org.apache.commons.codec.EncoderException;
import org.apache.commons.codec.net.URLCodec;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.repository.Repository;
import org.glassfish.jersey.server.ResourceConfig;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.rest.feature.CacheControl.NoCache;
import com.metaphacts.security.Permissions.TEMPLATE_PAGES;
import com.metaphacts.ui.templates.ST;
import com.metaphacts.ui.templates.ST.TEMPLATES;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Path("template")
@Singleton
public class TemplateEndpoint extends ResourceConfig {

    private static final Logger logger = LogManager.getLogger(TemplateEndpoint.class);

    private static final String Template_MIME_TYPE = "text/html";

    private static final IRI DEFAULT_TEMPLATE = RDFS.RESOURCE;

    private TemplateStorage<Long,URL> templateStorage;
    @Inject
    private ST st;

    @Inject
    private LabelCache labelCache;

    @Context
    private UriInfo uriInfo;

    @Context
    private HttpServletResponse servletResponse;

    private final Configuration config;

    private final NamespaceRegistry ns;

    private final MetaphactsHandlebars handlebars;

    private final ValueFactory vf;

    private RepositoryManager repositoryManager;

    private  TemplateIncludeCache includeCache;

    @Inject
    public TemplateEndpoint(
        Configuration config,
        NamespaceRegistry ns,
        RepositoryManager repositoryManager,
        TemplateIncludeCache includeCache,
        HandlebarsHelperRegistry helperRegistry
    ) {
        this.config= config;
        this.ns = ns;
        this.includeCache=includeCache;
        this.repositoryManager=repositoryManager;
        templateStorage = new SimpleFileTemplateStorage(
                new File(
                    config.getRuntimeDirectory(),
                    SimpleFileTemplateStorage.BASE_STORAGE_LOCATION
                )
        );
        handlebars  = new MetaphactsHandlebars(new FileTemplateLoader(templateStorage, ns), helperRegistry);
        vf = SimpleValueFactory.getInstance();
    }

    public static class RawTemplate {
        private String source;
        private int sourceHash;
        private Set<String> applicableTemplates;
        private String appliedTemplate;
        private Set<IRI> includes;

        public RawTemplate(String source, Set<String> applicableTemplates, Set<IRI> includes, String appliedTemplate) {
            this.source = source;
            this.sourceHash = source.hashCode();
            this.applicableTemplates = applicableTemplates;
            this.includes = includes;
            this.appliedTemplate= appliedTemplate;
        }

        public String getSource() {
            return source;
        }

        public Set<String> getApplicableTemplates() {
            return applicableTemplates;
        }

        public Set<IRI> getIncludes() {
            return includes;
        }

        public String getAppliedTemplate() {
            return appliedTemplate;
        }

        public int getSourceHash(){
            return this.sourceHash;
        }
    }

    public static class TemplateInfo {

        public TemplateInfo(String uri, URL location){
            this.uri=uri;
            this.date = new Date(); //TODO

        }
        public Date date;
        public String uri;
    }

    public static class RenderedTemplate {
        private String templateHtml;

        public RenderedTemplate(String templateHtml) {
            this.templateHtml = templateHtml;
        }

        /**
         * We overwrite hash code here, to use the hash code of the actual content i.e. the compiled
         * HTML string, as eTag for caching
         *
         * @see java.lang.Object#hashCode()
         */
        @Override
        public int hashCode() {
            return this.templateHtml.hashCode();
        };

        public String getTemplateHtml() {
            return this.templateHtml;
        }

        public static String getCompiledHtml(
            IRI pageId,
            TemplateContext tc,
            MetaphactsHandlebars handlebars,
            TemplateIncludeCache includeCache) throws IOException {

            if (!(tc.getValue() instanceof IRI)) {
                throw new IllegalArgumentException("Currently only browsing IRIs is supported.");
            }

            LinkedHashSet<String> rdfTemplateIncludes = Sets.newLinkedHashSet();
            // add the IRI itself as first entry
            rdfTemplateIncludes.add(pageId.stringValue());

            // add the template includes
            rdfTemplateIncludes.addAll(TemplateUtil.getRdfTemplateIncludeIdentifiers(pageId, tc, includeCache));

            // add default Template:rdfs:Resource as last option
            // TODO might need to be configurable in the future
            rdfTemplateIncludes.add(TemplateUtil.convertResourceToTemplateIdentifier(DEFAULT_TEMPLATE));

            return TemplateUtil.compileAndReturnFirstExistingTemplate(tc, rdfTemplateIncludes, handlebars).orElse(
                    "<i>It seems that the current resource \"" + pageId.stringValue()
                    + "\" does not identify any application or template page as well as none of the applicable template pages is instantiated.</i>"
                   );
        }
    }

    /**
     * Renders a resource page by applying all applicable template includes and
     * expanding server-side Handlebars markup. Returns a generic
     * "no defined template" page if no applicable templates found for a given resource.
     */
    @GET()
    @Path("html")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getResourceHtml(
            @NotNull @QueryParam("iri") IRI iri,
            @QueryParam("context") Optional<IRI> context,
            @QueryParam("repository") Optional<String> repositoryId,
            @Context UriInfo uriInfo,
            @Context Request request
    ) throws IOException {
        // by default the context equals the requested IRI, however, clients may overwrite it
        IRI templateContextIri = context.orElse(iri);
        try {
            Repository repo = repositoryManager.getRepository(repositoryId).orElse(repositoryManager.getDefault());
            TemplateContext tc = new TemplateContext(templateContextIri, repo, uriInfo);
            tc.setLabelCache(labelCache);
            tc.setNamespaceRegistry(this.ns);
            RenderedTemplate template = new RenderedTemplate(
                RenderedTemplate.getCompiledHtml(iri, tc, handlebars, includeCache));

            return withETagCacheControl(request, template, iri).build();
        } catch (IllegalArgumentException e) {
            return Response.serverError().entity(e.getMessage()).build();
        } catch (QueryEvaluationException | RepositoryException | SailException e){
            return Response.serverError().entity("Problem with database backend.").build();
        }catch (Exception e) {
            return Response.serverError().entity("Unknown error while compiling template.").build();
        }
    }

    private Response.ResponseBuilder withETagCacheControl(Request request, RenderedTemplate template, IRI templateIri) {
        // evaluate eTag precondition
        CacheControl cc = new CacheControl();
        EntityTag etag = new EntityTag(String.valueOf(template.hashCode()));
        Response.ResponseBuilder rb = request.evaluatePreconditions(etag);

        if (rb != null) {
            logger.trace("Returning 304: Compiled template {} with eTag {} seems to be cached by browser.", templateIri, etag.getValue());
            return rb.cacheControl(cc);
        }

        // tell the client that the response is stale
        // setting both "Cache-Control: max-age=0, must-revalidate" and "Cache-Control: no-cache" due to different browser interpretations
        // c.f. http://stackoverflow.com/questions/1046966/whats-the-difference-between-cache-control-max-age-0-and-no-cache
        //  SHOULD revalidate the response
        cc.setMaxAge(0);
        cc.setMustRevalidate(true);
        // MUST revalidate
        cc.setNoCache(true);

        return Response.ok(template, MediaType.APPLICATION_JSON).cacheControl(cc).tag(etag);
    }

    /**
     * Returns raw source of the resource (template) with expanded Handlebars markup.
     * If there is no defined template with the specified IRI, returns "not found" status.
     */
    @GET()
    @Path("pageHtml")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getTemplateHtml(
        @NotNull @QueryParam("iri") IRI iri,
        @QueryParam("repository") Optional<String> repositoryId,
        @Context UriInfo uriInfo,
        @Context Request request
    ) throws IOException {
        try {
            Repository repo = repositoryManager.getRepository(repositoryId).orElse(repositoryManager.getDefault());
            TemplateContext tc = new TemplateContext(iri, repo, uriInfo);
            tc.setLabelCache(labelCache);
            tc.setNamespaceRegistry(this.ns);

            LinkedHashSet<String> templateIncludes = Sets.newLinkedHashSet();
            templateIncludes.add(iri.stringValue());

            Optional<String> content = TemplateUtil.compileAndReturnFirstExistingTemplate(tc, templateIncludes, handlebars);
            if (!content.isPresent()) {
                return Response.status(Status.NOT_FOUND).build();
            }

            RenderedTemplate template = new RenderedTemplate(content.get());
            return withETagCacheControl(request, template, iri).build();
        } catch (IllegalArgumentException e) {
            return Response.serverError().entity(e.getMessage()).build();
        } catch (Exception e) {
            return Response.serverError().entity("Unknown error while compiling template.").build();
        }
    }

    @GET
    @NoCache // never cache the source i.e. if content is to be edited
    @Path("source")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresPermissions(TEMPLATE_PAGES.EDIT_VIEW)
    @RequiresAuthentication
    public Response getSource(
        @NotNull @QueryParam("iri") IRI iri,
        @QueryParam("repository") Optional<String> repositoryId
    ) throws IOException {
        String templateContent = templateStorage.getTemplateContent(iri).orElse("");

        Set<IRI> includes = Sets.newLinkedHashSet();
        try {
            includes.addAll(TemplateUtil.extractIncludeIRIs(templateContent,ns));
        } catch (IllegalArgumentException e) {
            logger.error("Problem while trying to extract handlebars includes from template source code:"+ e.getMessage());
        }
        Repository repo = repositoryManager.getRepository(repositoryId).orElse(repositoryManager.getDefault());
        TemplateContext tc = new TemplateContext(iri, repo, uriInfo);
        tc.setLabelCache(labelCache);
        tc.setNamespaceRegistry(this.ns);

        LinkedHashSet<String> orderedSetOfLocations = TemplateUtil.getRdfTemplateIncludeIdentifiers(iri, tc, includeCache);
        final RawTemplate rawTemplate = new RawTemplate(
                templateContent,
                orderedSetOfLocations,
                includes,
                TemplateUtil.findFirstExistingTemplate(this.handlebars.getLoader(), orderedSetOfLocations).orElse(
                        StringUtils.isEmpty(templateContent)
                        ? TemplateUtil.convertResourceToTemplateIdentifier(DEFAULT_TEMPLATE) // this should only be shown if no other template is applied
                        : null
                 )
               );

        // set etag, currently without CC headers (not chaching needed here)
        // clients may use the etag as reference and post it again on PUT i.e. to detect concurrent modifications
        EntityTag etag = new EntityTag(String.valueOf(rawTemplate.getSourceHash()));
        return Response.ok(rawTemplate).tag(etag).build();
    }

    @PUT
    @Path("source")
    @Consumes(Template_MIME_TYPE)
    @RequiresPermissions(TEMPLATE_PAGES.EDIT_SAVE)
    @RequiresAuthentication
    public Response save(@QueryParam("iri") IRI iri,  @QueryParam("beforeModificationHash") int beforeModificationHash, String pageSource) throws Exception {
        if (logger.isTraceEnabled()) {
            logger.trace("Saving Page: " + iri);
        }
        if(beforeModificationHash != 0){
            // content hash before saving
            int currentContentHash = templateStorage.getTemplateContent(iri).orElse("").hashCode();
            if(beforeModificationHash != currentContentHash){

                logger.warn("Concurrent modification of page {}", iri.stringValue());
                String msg = "Concurrent modification of page source. "
                        + "It seems that you or another user modified the page in the meantime. "
                        + "Please copy the code and resolve the conflict manually or overwrite it"
                        + " i.e. copy the code, refresh the page, replace the code and save it again.";
                return Response.status(Status.CONFLICT).entity(msg).build();
            }
        }
        templateStorage.storeNewRevision(iri, pageSource);
        return Response.created(new URI(iri.stringValue())).build();
    }

    @GET
    @NoCache
    @Path("getAllInfo")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresPermissions(TEMPLATE_PAGES.INFO_VIEW)
    @RequiresAuthentication
    public List< TemplateInfo> getAllInfo() throws IOException, URISyntaxException {
        List<TemplateInfo> list = Lists.newArrayList();
        for(IRI iri : templateStorage.getAllStoredTemplates()){
            Optional<URL> latest = templateStorage.getTemplateLocation(iri);
            if(latest.isPresent()){
                TemplateInfo info = new TemplateInfo(iri.stringValue(), latest.get());
                info.date = new Date(new File(latest.get().toURI()).lastModified());
                list.add(info);
            }

        }
        return list;
    }

    @POST
    @Path("exportRevisions")
    @Consumes("application/json")
    @Produces("application/zip")
    @RequiresPermissions(TEMPLATE_PAGES.INFO_EXPORT)
    @RequiresAuthentication
    public Response exportRevisions(final Map<String, Long> selected) throws IOException, EncoderException {
        if (selected.isEmpty()) {
            return Response.status(Status.NOT_ACCEPTABLE).build();
        }
        StreamingOutput stream = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException, WebApplicationException {
                try(ZipOutputStream zos = new ZipOutputStream(output)){
                    for (Entry<String, Long> s : selected.entrySet()) {
                        IRI iri = vf.createIRI(s.getKey());
                        String filename = new URLCodec().encode(iri.stringValue());
                        //TODO
                        ZipArchiveEntry entry = new ZipArchiveEntry(AbstractFileTemplateStorage.BASE_STORAGE_LOCATION+"/"+ filename + ".html");
                        zos.putNextEntry(entry);
                        //TODO exports latest
                        zos.write(templateStorage.getTemplateContent(iri).orElse("").getBytes());
                        zos.closeEntry();
                    }
                    zos.finish();
                    zos.flush();
                } catch (Exception e) {
                    logger.error("Error while exporting template pages: ", e);
                    throw new WebApplicationException(e.getMessage(), e);
                }
            }
        };
        return Response.ok(stream).header("Content-Disposition","attachment; filename="+getExportFileName()).build();
    }

    private String getExportFileName(){
        return "pageExport_" +  new SimpleDateFormat("yyyy-MM-dd_hh-mm-ss").format(new Date())+".zip";
    }

    @DELETE
    @Path("deleteRevisions")
    @Consumes("application/json")
    @RequiresPermissions(TEMPLATE_PAGES.INFO_DELETE)
    @RequiresAuthentication
    public void deleteRevisions(final Map<String, Long> selected) throws IOException, EncoderException {
        for (Entry<String, Long> s : selected.entrySet()) {
            templateStorage.deleteTemplate(vf.createIRI(s.getKey()));
        }
    }

    @GET()
    @Path("header")
    @Produces(MediaType.TEXT_HTML)
    public String getHeader() throws IOException {
        return st.getTemplateFromAppOrClasspathWithConfig(TEMPLATES.HEADER);
    }

    @GET()
    @Path("footer")
    @Produces(MediaType.TEXT_HTML)
    public String getFooter() throws IOException {
        return st.getTemplateFromAppOrClasspathWithConfig(TEMPLATES.FOOTER);
    }

}
