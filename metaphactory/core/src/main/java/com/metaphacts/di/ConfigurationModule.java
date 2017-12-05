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

package com.metaphacts.di;

import java.io.File;

import com.google.inject.AbstractModule;
import com.google.inject.Singleton;
import com.google.inject.Provider;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.google.inject.Injector;
import org.apache.commons.configuration2.ex.ConfigurationException;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class ConfigurationModule extends AbstractModule {
        @Override
        protected void configure() {
            
            bind(Configuration.class).in(Singleton.class);
        }

    @Provides @Singleton
    NamespaceRegistry getNamespaceRegistry() throws ConfigurationException {
        NamespaceRegistry ns = new NamespaceRegistry(new File(Configuration.getConfigBasePath()));
        return ns;
    }
}
