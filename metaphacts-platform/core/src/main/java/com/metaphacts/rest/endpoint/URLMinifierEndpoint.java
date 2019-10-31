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

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.eclipse.rdf4j.repository.RepositoryException;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.UriInfo;

import com.metaphacts.rest.feature.CacheControl.NoCache;
import com.metaphacts.services.URLMinifierService;
import com.metaphacts.security.Permissions.SERVICES;


/**
 * Endpoint for REST access to bimap of short link key and corresponding URLs
 * Used by client side to generate short link on demand
 * 
 * @author Denis Ostapenko
 */
@Path("url-minify")
public class URLMinifierEndpoint {
    private static final Logger logger = LogManager.getLogger(URLMinifierEndpoint.class);

    @Context
    UriInfo uri;

    @Inject
    private URLMinifierService urlMinifierService;

    @GET()
    @NoCache
    @Path("getShort")
    @Produces(MediaType.TEXT_PLAIN)
    @RequiresPermissions(SERVICES.URL_MINIFY)
    public String getShort(@QueryParam("url") String url) throws RepositoryException {
        String key = urlMinifierService.queryDBByURL(url);
        if (key == null) {
            while (true) {
                key = urlMinifierService.randomKey();
                if (urlMinifierService.queryDBByKey(key) == null) {
                    urlMinifierService.addKeyURL(key, url);
                    break;
                }
            }
        }
        return key;
    }
}
