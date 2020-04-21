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

import java.util.logging.Logger;

import javax.inject.Inject;

import org.apache.shiro.web.jaxrs.ShiroFeature;
import org.glassfish.hk2.api.ServiceLocator;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.logging.LoggingFeature;
import org.glassfish.jersey.media.multipart.MultiPartFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.jvnet.hk2.guice.bridge.api.GuiceBridge;
import org.jvnet.hk2.guice.bridge.api.GuiceIntoHK2Bridge;
import org.researchspace.di.GuiceServletConfig;
import org.researchspace.rest.feature.CacheControlFeature;
import org.researchspace.rest.providers.IriParamProvider;
import org.researchspace.rest.providers.JacksonObjectMapperProvider;
import org.researchspace.rest.providers.OptionalParamProvider;
import org.researchspace.rest.providers.Rdf4jModelTurtleMessageBodyWriter;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public abstract class AbstractPlatformApplication extends ResourceConfig {

    public Logger logger = Logger.getLogger(AbstractPlatformApplication.class.getName());

    @Inject
    public AbstractPlatformApplication(ServiceLocator serviceLocator) {

        // uncomment for debugging purpose
        // https://jersey.java.net/documentation/latest/user-guide.html#tracing
        // property("jersey.config.server.tracing.type", "ALL");
        // property("jersey.config.server.tracing.threshold", "VERBOSE");

        GuiceBridge.getGuiceBridge().initializeGuiceBridge(serviceLocator);

        GuiceIntoHK2Bridge guiceBridge = serviceLocator.getService(GuiceIntoHK2Bridge.class);
        guiceBridge.bridgeGuiceInjector(GuiceServletConfig.injector);

        register(JacksonFeature.class);
        register(JacksonObjectMapperProvider.class);
        register(IriParamProvider.class);

        register(OptionalParamProvider.class);
        register(ShiroFeature.class);
        register(Rdf4jModelTurtleMessageBodyWriter.class);
        register(MultiPartFeature.class);

        register(CacheControlFeature.class);

        if (logger.isLoggable(java.util.logging.Level.FINER)) {
            register(new LoggingFeature(Logger.getLogger(AbstractPlatformApplication.class.getName())));
        }
    }
}