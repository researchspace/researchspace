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

import java.util.Set;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.glassfish.hk2.api.ServiceLocator;
import org.researchspace.di.GuiceServletConfig;
import org.researchspace.plugin.PlatformPluginManager;

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
        PlatformPluginManager pluginManger = GuiceServletConfig.injector.getInstance(PlatformPluginManager.class);
        Set<Class<?>> extensions = pluginManger.getRestExtensions();
        logger.info("Trying to register the following RestExtensions: {}", extensions);
        registerClasses(extensions);
    }

}
