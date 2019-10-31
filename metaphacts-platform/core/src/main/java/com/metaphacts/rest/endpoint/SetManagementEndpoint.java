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

import com.metaphacts.data.rdf.container.UserSetRootContainer;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;

import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;

/**
 * REST methods for querying {@link com.metaphacts.data.rdf.container.SetRootContainer user set container}
 * and default {@link com.metaphacts.data.rdf.container.SetContainer set} IRIs for current or other user.
 *
 * @see com.metaphacts.templates.helper.SetManagementHelperSource
 * 
 * @author Alexey Morozov
 */
@Path("sets")
@Singleton
public class SetManagementEndpoint {
    @GET
    @Path("getUserSetRootContainerIri")
    @RequiresAuthentication
    @Produces(MediaType.TEXT_PLAIN)
    public String getUserSetRootContainerIri(@QueryParam("username") String otherUsername) {
        String username = otherUsername == null ? getCurrentUsername() : otherUsername;
        return UserSetRootContainer.setContainerIriForUser(username);
    }

    @GET
    @Path("getUserDefaultSetIri")
    @RequiresAuthentication
    @Produces(MediaType.TEXT_PLAIN)
    public String getUserDefaultSetIri(@QueryParam("username") String otherUsername) {
        String username = otherUsername == null ? getCurrentUsername() : otherUsername;
        return UserSetRootContainer.defaultSetIriForUser(username);
    }

    private String getCurrentUsername() {
        return SecurityUtils.getSubject().getPrincipal().toString();
    }
}
