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

import java.io.IOException;
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

import com.metaphacts.security.FormAuthenticationFilter;
import com.metaphacts.ui.templates.ST;
import com.metaphacts.ui.templates.ST.TEMPLATES;


/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Path("")
public class LoginEndpoint {
    @Inject
    private ST st;

    @Inject @Named("ASSETS_MAP")
    private Map<String, String> assetsMap;

    @GET()
    @Path("{path: .*}")
    @Produces(MediaType.TEXT_HTML)
    public String getLoginPageGet(@Context HttpServletRequest httpRequest) throws IOException {
        return getPage(httpRequest);
    }
    
    /**
     * POST is needed for redirect after authentication failure i.e. {@link FormAuthenticationFilter} 
     * redirects the POST sent with an login attempt again to the /login url.
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
        if(request.getAttribute(FormAuthenticationFilter.DEFAULT_ERROR_KEY_ATTRIBUTE_NAME)!=null){
            map.put(FormAuthenticationFilter.DEFAULT_ERROR_KEY_ATTRIBUTE_NAME, "Username or Password incorrect.");
        }
        map.put("assetsMap", this.assetsMap);
        return st.renderPageLayoutTemplate(TEMPLATES.LOGIN_PAGE, map);
    }
}
