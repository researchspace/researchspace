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

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.validation.constraints.NotNull;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.shiro.authz.annotation.RequiresAuthentication;

import com.metaphacts.repository.RepositoryManager;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@Path("repositories")
public class RepositoryManagerEndpoint {
    @Inject
    private RepositoryManager repositoryManager;
    
    @GET
    @RequiresAuthentication
    @Produces(APPLICATION_JSON)
    //@RequiresPermissions(SPARQL.GRAPH_STORE_GET)
    public  Response getAvailableRepositoryConfigs() {
        try{
            return Response.ok(repositoryManager.getAvailableRepositoryConfigs()).build();
        }catch(Exception e){
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }
    
    @GET
    @Path("config/{repositoryId}")
    @RequiresAuthentication
    @Produces("text/turtle")
    //@RequiresPermissions(SPARQL.GRAPH_STORE_GET)
    public  Response getAvailableRepositoryConfigs(@NotNull @PathParam("repositoryId") String repID) {
        try{
            return Response.ok(repositoryManager.getTurtleConfigStringForRepositoryConfig(repID)).build();
        }catch(Exception e){
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }
}