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

package com.metaphacts.rest;

import java.util.ServiceLoader;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.glassfish.hk2.api.ServiceLocator;

import com.metaphacts.rest.endpoint.AppAdminEndpoint;
import com.metaphacts.rest.endpoint.CacheEndpoint;
import com.metaphacts.rest.endpoint.ConfigurationEndpoint;
import com.metaphacts.rest.endpoint.LogAdminEndpoint;
import com.metaphacts.rest.endpoint.OntologyManagerEndpoint;
import com.metaphacts.rest.endpoint.RdfNamespaceEndpoint;
import com.metaphacts.rest.endpoint.RepositoryManagerEndpoint;
import com.metaphacts.rest.endpoint.ResourceUtilsEndpoint;
import com.metaphacts.rest.endpoint.SecurityEndpoint;
import com.metaphacts.rest.endpoint.SetManagementEndpoint;
import com.metaphacts.rest.endpoint.SystemAdminEndpoint;
import com.metaphacts.rest.endpoint.TemplateEndpoint;
import com.metaphacts.rest.endpoint.URLMinifierEndpoint;

/**
 * Main REST application with explicit /rest URL pattern.
 *
 * For the time being endpoints should be explicitly registered.
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@ApplicationPath("rest")
public class RestApplication extends AbstractPlatformApplication {

    private static final Logger logger = LogManager.getLogger(RestApplication.class);

    @Inject
    public RestApplication(ServiceLocator serviceLocator) {
        super(serviceLocator);

        /*
         *  /rest/template
         */
        register(TemplateEndpoint.class);
        /*
         *  /rest/security
         */
        register(SecurityEndpoint.class);

        /*
         *  /rest/data/rdf/namespace
         */
        register(RdfNamespaceEndpoint.class);
        /*
         *  /rest/data/data/rdf/utils
         */
        register(ResourceUtilsEndpoint.class);
        /*
         *  /rest/config
         */
        register(ConfigurationEndpoint.class);
        /*
         *  /rest/cache
         */
        register(CacheEndpoint.class);
        /*
         *  /rest/url-minify
         */
        register(URLMinifierEndpoint.class);
        /*
         *  /rest/sets
         */
        register(SetManagementEndpoint.class);

        /*
         *  /rest/repositories
         */
        register(RepositoryManagerEndpoint.class);

        /*
         * /rest/ontologies
         */
        register(OntologyManagerEndpoint.class);

        /*
         * Exception mapper for a generic {@link Exception} not caught in the method itself.
         */
        register(DefaultExceptionMapper.class);

        /*
         * Exception mapper for a security {@link Exception} not caught in the method itself.
         */
        register(ForbiddenExceptionMapper.class);

        register(AppAdminEndpoint.class);
        
        register(SystemAdminEndpoint.class);

        register(LogAdminEndpoint.class);

        // registration using service loader
        for (RestEndpoint endpoint : ServiceLoader.load(RestEndpoint.class)) {
            logger.trace("Loaded rest endpoint {}", endpoint.getClass());
            register(endpoint.getClass());
        }
    }

}
