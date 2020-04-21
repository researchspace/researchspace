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

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.researchspace.data.rdf.container.UserSetRootContainer;

import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;

/**
 * REST methods for querying
 * {@link org.researchspace.data.rdf.container.SetRootContainer user set
 * container} and default
 * {@link org.researchspace.data.rdf.container.SetContainer set} IRIs for
 * current or other user.
 *
 * @see org.researchspace.templates.helper.SetManagementHelperSource
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
