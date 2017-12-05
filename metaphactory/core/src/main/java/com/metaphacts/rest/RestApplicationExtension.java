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

import java.util.Set;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.glassfish.hk2.api.ServiceLocator;

import com.metaphacts.di.GuiceServletConfig;
import com.metaphacts.plugin.MetaphactoryPluginManager;
/**
 * RestApplication to hook-in 3rd party extensions loaded via service loader
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
@ApplicationPath("rest/extension")
public class RestApplicationExtension extends AbstractPlatformApplication {

    private static Logger logger = LogManager.getLogger(RestApplicationExtension.class);

    
    @Inject
    public RestApplicationExtension(ServiceLocator serviceLocator) {
        super(serviceLocator);
        MetaphactoryPluginManager pluginManger= GuiceServletConfig.injector.getInstance(MetaphactoryPluginManager.class);
        Set<Class<?>> extensions = pluginManger.getRestExtensions();
        logger.info("Trying to register the following RestExtensions: {}",extensions);
        registerClasses(extensions);
    }
    
}