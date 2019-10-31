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

import java.net.URI;
import java.net.URISyntaxException;

import org.apache.http.HttpRequest;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.eclipse.rdf4j.repository.RepositoryException;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import com.metaphacts.services.URLMinifierService;
import com.metaphacts.rest.feature.CacheControl.NoCache;


/**
 * Endpoint for 301 redirects on short /l/XXXXX links
 * 
 * @author Denis Ostapenko
 */
@Path("")
public class URLMinifierRedirectEndpoint {
    private static final Logger logger = LogManager.getLogger(URLMinifierRedirectEndpoint.class);

    @Context
    private UriInfo uri;

    @Inject
    private URLMinifierService urlMinifierService;

    @GET()
    @NoCache
    @Path("{path: .*}")
    public Response redirect(@Context HttpRequest httpRequest) throws RepositoryException, URISyntaxException {
        String shortURL = uri.getPath();
        if (shortURL.length() < URLMinifierService.KEY_LENGTH) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        String key = shortURL.substring(shortURL.length() - URLMinifierService.KEY_LENGTH);
        String url = urlMinifierService.queryDBByKey(key);
        if (url == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.status(Response.Status.MOVED_PERMANENTLY).location(new URI(url)).build();
    }
}
