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

package org.researchspace.kp;


import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.model.IRI;

/**
 * @author Artem Kozlov <artem@rem.sh>
 */
@Singleton
@Path("kp")
public class KnowledgePatternsEndpoint {

    @Inject
    private KnowledgePatternGenerator pg;

    @Inject
    private KnowledgeMapConfigGenerator cg;

    @GET
    public Response test() {
        return Response.ok("it works").build();
    }

    @POST
    @Path("/generateKps")
    public Response generateKps(@QueryParam("ontologyIri") IRI ontologyIri) {
        pg.generateKnowledgePatternsFromOntology(ontologyIri);
        return Response.ok().build();
    }

    @GET
    @Path("/generateKmConfig")
    public Response generateKmConfig() {
        return Response.ok(cg.generateKmConfig())
            .header("content-disposition", "attachment; filename = authoring-config.html")
            .build();
    }
}
