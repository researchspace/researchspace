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

package org.researchspace.rest.endpoint;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Optional;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFWriterRegistry;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.api.sparql.ServletRequestUtil;
import org.researchspace.api.sparql.SparqlOperationBuilder;
import org.researchspace.api.sparql.SparqlUtil;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.ReadConnection;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.ui.templates.MainTemplate;

/**
 * Main application entry point.
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Path("")
@Singleton
public class ResourceEndpoint {

    @SuppressWarnings("unused")
    private static Logger logger = LogManager.getLogger(ResourceEndpoint.class);

    @Inject
    private MainTemplate mainTemplate;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private NamespaceRegistry namespaceRegistry;

    /**
     * When accessing from browser, return main template with client-side logic to
     * present resource
     *
     * @return
     * @throws IOException
     */
    @GET()
    @Path("{path: .*}")
    @Produces(MediaType.TEXT_HTML)
    @NoCache
    public String getMainPage() throws IOException {
        return mainTemplate.getMainTemplate();
    }

    /**
     * If there's no Accept: text/html, we'll do custom content negotiation here
     *
     * @param httpServletRequest bind by Jersey
     * @return
     * @throws IOException
     */
    @GET()
    @Path("{path: .*}")
    public Response getResource(@Context HttpServletRequest httpServletRequest, @Context UriInfo uriInfo)
            throws Exception {

        // we have two strategies to get iri: passed uri parameter or prefixed element
        // of path
        String stringIri = null;
        // check if it's in parameter ?uri=
        stringIri = uriInfo.getQueryParameters().getFirst("uri");

        if (stringIri == null) {
            // check if we could convert path parameter with namespace to IRI
            String path = uriInfo.getPathParameters().getFirst("path");
            Optional<IRI> convertedIri = namespaceRegistry.resolveToIRI(path);
            if (!convertedIri.isPresent())
                return Response.status(Response.Status.BAD_REQUEST).entity("Could not translate IRI " + path).build();
            stringIri = convertedIri.get().toString();
        }

        IRI iri;
        try {
            iri = SimpleValueFactory.getInstance().createIRI(stringIri);
        } catch (IllegalArgumentException iae) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Not a valid IRI: <" + stringIri + ">").build();
        }

        if (!new ReadConnection(repositoryManager.getDefault()).hasOutgoingStatements(iri)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Entity with IRI <" + iri.stringValue() + "> does not exist").build();
        }

        return getRdfResponse(httpServletRequest, stringIri);
    }

    /**
     * Do content negotiation like in SparqlServlet and return sparql describe
     * result
     * 
     * @param httpServletRequest
     * @param uri
     * @return
     */
    private Response getRdfResponse(HttpServletRequest httpServletRequest, String uri) {
        Optional<String> preferredMimeType = ServletRequestUtil
                .getPreferredMIMEType(SparqlUtil.getAllRegisteredWriterMimeTypes(), httpServletRequest);

        if (!preferredMimeType.isPresent()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Unknown or empty accept header.").build();
        }
        String mimeType = preferredMimeType.get();

        SparqlOperationBuilder<GraphQuery> builder = SparqlOperationBuilder.<GraphQuery>create("DESCRIBE <" + uri + ">",
                GraphQuery.class);
        try (RepositoryConnection con = repositoryManager.getDefault().getConnection()) {
            GraphQuery query = builder.build(con);
            RDFWriterRegistry resultWriterRegistry = RDFWriterRegistry.getInstance();
            RDFFormat rdfFormat = resultWriterRegistry.getFileFormatForMIMEType(mimeType).orElse(RDFFormat.TURTLE);
            try (final GraphQueryResult gqr = query.evaluate()) {
                final Model model = QueryResults.asModel(query.evaluate());
                StreamingOutput stream = new StreamingOutput() {
                    @Override
                    public void write(OutputStream output) throws IOException, WebApplicationException {
                        Rio.write(model, output, rdfFormat);
                    }
                };
                return Response.ok(stream).type(mimeType).build();
            } catch (QueryEvaluationException e) {
                return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
            }
        }
    }

}
