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

package com.metaphacts.di;

import java.util.Map;
import java.util.Map.Entry;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.inject.Injector;
import com.google.inject.servlet.ServletModule;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.servlet.MProxyServlet;
import com.metaphacts.servlet.ProxyConfigs;
import com.metaphacts.servlet.SparqlServlet;
import com.metaphacts.servlet.filter.AssetFilter;
import com.metaphacts.servlet.filter.CorsFilter;
import com.metaphacts.servlet.filter.ErrorLoggingFilter;
import com.metaphacts.servlet.filter.HomePageFilter;
import com.metaphacts.servlet.filter.MDCFilter;
import com.metaphacts.servlet.filter.RewriteFilter;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class PlatformGuiceModule extends ServletModule {
    private static final Logger logger = LogManager.getLogger(PlatformGuiceModule.class);

    private final Injector coreInjector;

    public PlatformGuiceModule(Injector coreInjector) {
        this.coreInjector = coreInjector;
    }

    @Override
    protected void configureServlets() {
        //register servlet filters

        // invoke MDCFilter before all other filters and endpoints, so that the MDC context
        // variables are available for all log commands throughout the application
        filter("*").through(MDCFilter.class);
        filter(
            AssetFilter.ASSETS_PATH_PREFIX + "*",
            AssetFilter.IMAGES_PATH_PREFIX + "*"
        ).through(AssetFilter.class);
        filter("*").through(HomePageFilter.class);

        filter("*").through(RewriteFilter.class);
        filter("*").through(CorsFilter.class);
        filter("/rest/*").through(ErrorLoggingFilter.class);

        //register servlets
        serve("/sparql").with(SparqlServlet.class);

        PlatformStorage platformStorage = coreInjector.getProvider(PlatformStorage.class).get();
        Map<String, Map<String, String>> proxies = ProxyConfigs.getConfigs(platformStorage);

        for (Entry<String, Map<String, String>> proxy : proxies.entrySet()) {
            logger.info("Registering proxy {}", proxy.getKey());
            serve("/proxy/" + proxy.getKey() + "/*").with(new MProxyServlet(proxy.getKey()),
                    proxy.getValue());
        }
    }

}
