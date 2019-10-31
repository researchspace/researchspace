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

import java.util.logging.Logger;

import javax.inject.Inject;

import org.glassfish.hk2.api.ServiceLocator;
import org.glassfish.jersey.filter.LoggingFilter;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.media.multipart.MultiPartFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.jvnet.hk2.guice.bridge.api.GuiceBridge;
import org.jvnet.hk2.guice.bridge.api.GuiceIntoHK2Bridge;
import org.secnod.shiro.jaxrs.ShiroExceptionMapper;
import org.secnod.shiro.jersey.AuthInjectionBinder;
import org.secnod.shiro.jersey.AuthorizationFilterFeature;
import org.secnod.shiro.jersey.SubjectFactory;

import com.metaphacts.di.GuiceServletConfig;
import com.metaphacts.rest.feature.CacheControlFeature;
import com.metaphacts.rest.providers.IriParamProvider;
import com.metaphacts.rest.providers.JacksonObjectMapperProvider;
import com.metaphacts.rest.providers.OptionalParamProvider;
import com.metaphacts.rest.providers.Rdf4jModelTurtleMessageBodyWriter;

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
        register(AuthorizationFilterFeature.class);
        register(SubjectFactory.class);
        register(AuthInjectionBinder.class);
        register(ShiroExceptionMapper.class);
        register(Rdf4jModelTurtleMessageBodyWriter.class);
        register(MultiPartFeature.class);

        register(CacheControlFeature.class);

        if(logger.isLoggable(java.util.logging.Level.FINER)) {
            registerInstances(
                new LoggingFilter(
                    Logger.getLogger(AbstractPlatformApplication.class.getName()), false
                )
            );
        }
    }
}