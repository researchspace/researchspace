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

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;
import static javax.ws.rs.core.MediaType.TEXT_PLAIN;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;

import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.researchspace.config.NamespaceRecord;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.NamespaceRegistry.ProtectedNamespaceDeletionException;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.Permissions.NAMESPACES;

import com.fasterxml.jackson.core.JsonParser;
import com.google.common.base.Throwables;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@Path("data/rdf/namespace")
public class RdfNamespaceEndpoint {

    @Inject
    private NamespaceRegistry ns;

    @POST
    @Path("getFullUris")
    @Produces(APPLICATION_JSON)
    @Consumes(APPLICATION_JSON)
    public Response getFullUris(final JsonParser jp) throws IOException {
        final ValueFactory vf = SimpleValueFactory.getInstance();
        final JsonUtil.JsonFieldProducer processor = (jGenerator, input) -> {
            try {
                jGenerator.writeStringField(input, ns.resolveToIRI(input).map(iri -> iri.stringValue())
                        .orElse(vf.createIRI(ns.getDefaultNamespace(), input).stringValue()));
            } catch (IOException e) {
                throw Throwables.propagate(e);
            }
        };
        final StreamingOutput stream = JsonUtil.processJsonMap(jp, processor);
        return Response.ok(stream).build();
    }

    /**
     * Takes array of URIs, returns array of corresponding prefixed URIs. Set
     * prefixed URI to null if it is not possible to create prefixed URI.)
     */
    @POST
    @Path("getPrefixedUris")
    @Produces(APPLICATION_JSON)
    @Consumes(APPLICATION_JSON)
    public Response getPrefixedUris(final JsonParser jp) throws IOException {
        final ValueFactory vf = SimpleValueFactory.getInstance();
        final JsonUtil.JsonFieldProducer processor = (jGenerator, input) -> {
            try {
                jGenerator.writeStringField(input, ns.getPrefixedIRI(vf.createIRI(input)).orElse(null));
            } catch (IOException e) {
                throw Throwables.propagate(e);
            }
        };
        final StreamingOutput stream = JsonUtil.processJsonMap(jp, processor);
        return Response.ok(stream).build();
    }

    @GET
    @Path("getRegisteredPrefixes")
    @NoCache
    @Produces(APPLICATION_JSON)
    public Map<String, String> getRegisteredPrefixes() {
        return ns.getPrefixMap();
    }

    @GET
    @Path("getRecords")
    @NoCache
    @Produces(APPLICATION_JSON)
    public List<NamespaceRecord> getRecords() {
        return ns.getRecords();
    }

    @PUT
    @Path("setPrefix/{prefix}")
    @Consumes(TEXT_PLAIN)
    @RequiresAuthentication
    @RequiresPermissions({ NAMESPACES.CHANGE, NAMESPACES.CREATE })
    public Response updatePrefix(@PathParam("prefix") String prefix, @QueryParam("targetAppId") String targetAppId,
            String iriString) throws InternalServerErrorException {
        try {
            IRI iri = SimpleValueFactory.getInstance().createIRI(iriString);
            ns.setPrefix(prefix, iri, targetAppId);
            return Response.created(URI.create(iriString)).build();
        } catch (ProtectedNamespaceDeletionException | IllegalArgumentException e) {
            return Response.status(Status.BAD_REQUEST).entity(e.getMessage()).type("text/plain").build();
        } catch (Exception e) {
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).type("text/plain").build();
        }
    }

    @DELETE
    @Path("deletePrefix/{prefix}")
    @RequiresAuthentication
    @RequiresPermissions(NAMESPACES.DELETE)
    public Response deletePrefix(@PathParam("prefix") String prefix, @QueryParam("targetAppId") String targetAppId)
            throws InternalServerErrorException {
        try {
            boolean found = ns.deletePrefix(prefix, targetAppId);
            if (!found) {
                return Response.status(Status.NOT_FOUND).build();
            }
            return Response.ok().build();
        } catch (IllegalArgumentException e) {
            return Response.status(Status.BAD_REQUEST).entity(e.getMessage()).type("text/plain").build();
        } catch (Exception e) {
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).type("text/plain").build();
        }
    }
}
