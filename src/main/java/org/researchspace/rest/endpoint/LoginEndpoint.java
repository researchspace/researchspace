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
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Provider;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

import org.researchspace.di.AssetsMap;
import org.researchspace.security.FormAuthenticationFilter;
import org.researchspace.ui.templates.ST;
import org.researchspace.ui.templates.ST.TEMPLATES;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Path("")
public class LoginEndpoint {
    @Inject
    private ST st;

    @Inject
    private Provider<AssetsMap> assetsMap;

    @GET()
    @Path("{path: .*}")
    @Produces(MediaType.TEXT_HTML)
    public String getLoginPageGet(@Context HttpServletRequest httpRequest) throws IOException {
        return getPage(httpRequest);
    }

    /**
     * POST is needed for redirect after authentication failure i.e.
     * {@link FormAuthenticationFilter} redirects the POST sent with an login
     * attempt again to the /login url.
     * 
     * @param httpRequest
     * @return
     */
    @POST()
    @Path("{path: .*}")
    @Produces(MediaType.TEXT_HTML)
    public String getLoginPagePost(@Context HttpServletRequest httpRequest) throws IOException {
        return getPage(httpRequest);
    }

    private String getPage(HttpServletRequest request) throws IOException {
        Map<String, Object> map = st.getDefaultPageLayoutTemplateParams();
        if (request.getAttribute(
                org.apache.shiro.web.filter.authc.FormAuthenticationFilter.DEFAULT_ERROR_KEY_ATTRIBUTE_NAME) != null) {
            map.put(org.apache.shiro.web.filter.authc.FormAuthenticationFilter.DEFAULT_ERROR_KEY_ATTRIBUTE_NAME,
                    "Incorrect username or password.");
        }
        map.put("assetsMap", this.assetsMap.get().getAssets());
        return st.renderPageLayoutTemplate(TEMPLATES.LOGIN_PAGE, map);
    }
}
