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

package org.researchspace.junit;

import javax.inject.Inject;

import org.glassfish.hk2.api.ServiceLocator;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTest;
import org.jvnet.hk2.guice.bridge.api.GuiceBridge;
import org.jvnet.hk2.guice.bridge.api.GuiceIntoHK2Bridge;

import static com.google.common.base.Preconditions.checkNotNull;

import com.google.inject.Injector;

/**
 * {@link ResourceConfig} for {@link JerseyTest}s to be configured in
 * {@link JerseyTest#}
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class ResourceTestConfig extends ResourceConfig {
    public static Injector injector;

    @Inject
    public ResourceTestConfig(ServiceLocator serviceLocator) {
        checkNotNull(ResourceTestConfig.injector, "Injector must be set statically before invocation of the bridge.");
        GuiceBridge.getGuiceBridge().initializeGuiceBridge(serviceLocator);

        GuiceIntoHK2Bridge guiceBridge = serviceLocator.getService(GuiceIntoHK2Bridge.class);
        guiceBridge.bridgeGuiceInjector(ResourceTestConfig.injector);
    }
}