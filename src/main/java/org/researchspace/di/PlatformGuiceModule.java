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

package org.researchspace.di;

import java.util.Map;
import java.util.Map.Entry;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.servlet.MProxyServlet;
import org.researchspace.servlet.ProxyConfigs;
import org.researchspace.servlet.SparqlServlet;
import org.researchspace.servlet.filter.AssetFilter;
import org.researchspace.servlet.filter.CorsFilter;
import org.researchspace.servlet.filter.ErrorLoggingFilter;
import org.researchspace.servlet.filter.HomePageFilter;
import org.researchspace.servlet.filter.MDCFilter;
import org.researchspace.servlet.filter.RewriteFilter;

import com.google.inject.Injector;
import com.google.inject.servlet.ServletModule;

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
        // register servlet filters

        // invoke MDCFilter before all other filters and endpoints, so that the MDC
        // context
        // variables are available for all log commands throughout the application
        filter("*").through(MDCFilter.class);
        filter(AssetFilter.ASSETS_PATH_PREFIX + "*", AssetFilter.IMAGES_PATH_PREFIX + "*").through(AssetFilter.class);
        filter("*").through(HomePageFilter.class);

        filter("*").through(RewriteFilter.class);
        filter("*").through(CorsFilter.class);
        filter("/rest/*").through(ErrorLoggingFilter.class);

        // register servlets
        serve("/sparql").with(SparqlServlet.class);

        PlatformStorage platformStorage = coreInjector.getProvider(PlatformStorage.class).get();
        SecretResolver secretResolver = coreInjector.getProvider(SecretResolver.class).get();
        Map<String, Map<String, String>> proxies = ProxyConfigs.getConfigs(platformStorage, secretResolver);

        for (Entry<String, Map<String, String>> proxy : proxies.entrySet()) {
            logger.info("Registering proxy {}", proxy.getKey());
            serve("/proxy/" + proxy.getKey() + "/*").with(new MProxyServlet(proxy.getKey()), proxy.getValue());
        }
    }

}
