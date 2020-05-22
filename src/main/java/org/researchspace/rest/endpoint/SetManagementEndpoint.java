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

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.container.UserSetRootContainer;
import org.researchspace.security.PlatformSecurityManager;
import org.researchspace.security.SecurityService;
import org.researchspace.vocabulary.PLATFORM;

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

    @Inject
    private NamespaceRegistry ns;

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

    /**
     * use local name of the user IRI because the same user can have few different
     * logins, e.g anonymous and anonymous-user.
     * 
     * @see PlatformSecurityManager#getAnonymousSubject()
     */
    private String getCurrentUsername() {
        IRI userIri = ns.getUserIRI();
        if (userIri.equals(PLATFORM.ANONYMOUS_USER_INDIVIDUAL)) {
            return PlatformSecurityManager.ANONYMOUS_PRINCIPAL;
        } else {
            return SecurityService.getUserName();
        }
    }
}
