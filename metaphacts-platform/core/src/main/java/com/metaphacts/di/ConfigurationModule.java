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

import com.google.inject.AbstractModule;
import com.google.inject.Singleton;
import com.metaphacts.plugin.PlatformPluginManager;
import com.metaphacts.sail.rest.sql.MpJDBCDriverManager;
import com.metaphacts.secrets.DefaultSecretsStore;
import com.metaphacts.secrets.SecretResolver;
import com.metaphacts.secrets.SecretsStore;
import com.metaphacts.services.storage.MainPlatformStorage;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.services.storage.api.StorageRegistry;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class ConfigurationModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(CacheManager.class).in(Singleton.class);
        bind(StorageRegistry.class).in(Singleton.class);
        bind(PlatformPluginManager.class).in(Singleton.class);
        bind(PlatformStorage.class).to(MainPlatformStorage.class).in(Singleton.class);
        bind(Configuration.class).in(Singleton.class);
        bind(MpJDBCDriverManager.class).in(Singleton.class);
        bind(PlatformPluginManager.Starter.class).asEagerSingleton();
        bind(NamespaceRegistry.class).in(Singleton.class);
        bind(SecretsStore.class).to(DefaultSecretsStore.class).in(Singleton.class);
        bind(SecretResolver.class).to(SecretsStore.class).in(Singleton.class);
    }
}
