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

package com.metaphacts.rest;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import com.metaphacts.rest.endpoint.*;
import org.glassfish.hk2.api.ServiceLocator;

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
    }

}
