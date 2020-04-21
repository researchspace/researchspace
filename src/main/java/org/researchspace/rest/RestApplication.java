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

package org.researchspace.rest;

import java.util.ServiceLoader;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.glassfish.hk2.api.ServiceLocator;
import org.researchspace.rest.endpoint.AppAdminEndpoint;
import org.researchspace.rest.endpoint.CacheEndpoint;
import org.researchspace.rest.endpoint.ConfigurationEndpoint;
import org.researchspace.rest.endpoint.FieldEndpoint;
import org.researchspace.rest.endpoint.LogAdminEndpoint;
import org.researchspace.rest.endpoint.RdfNamespaceEndpoint;
import org.researchspace.rest.endpoint.RepositoryManagerEndpoint;
import org.researchspace.rest.endpoint.ResourceUtilsEndpoint;
import org.researchspace.rest.endpoint.SecurityEndpoint;
import org.researchspace.rest.endpoint.SetManagementEndpoint;
import org.researchspace.rest.endpoint.SystemAdminEndpoint;
import org.researchspace.rest.endpoint.TemplateEndpoint;
import org.researchspace.rest.endpoint.URLMinifierEndpoint;

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
         * /rest/template
         */
        register(TemplateEndpoint.class);
        /*
         * /rest/fields
         */
        register(FieldEndpoint.class);
        /*
         * /rest/security
         */
        register(SecurityEndpoint.class);

        /*
         * /rest/data/rdf/namespace
         */
        register(RdfNamespaceEndpoint.class);
        /*
         * /rest/data/data/rdf/utils
         */
        register(ResourceUtilsEndpoint.class);
        /*
         * /rest/config
         */
        register(ConfigurationEndpoint.class);
        /*
         * /rest/cache
         */
        register(CacheEndpoint.class);
        /*
         * /rest/url-minify
         */
        register(URLMinifierEndpoint.class);
        /*
         * /rest/sets
         */
        register(SetManagementEndpoint.class);

        /*
         * /rest/repositories
         */
        register(RepositoryManagerEndpoint.class);

        /*
         * Exception mapper for a generic {@link Exception} not caught in the method
         * itself.
         */
        register(DefaultExceptionMapper.class);

        /*
         * Exception mapper for a security {@link Exception} not caught in the method
         * itself.
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
