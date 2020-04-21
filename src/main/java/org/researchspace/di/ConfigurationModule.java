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

import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.plugin.PlatformPluginManager;
import org.researchspace.sail.rest.sql.MpJDBCDriverManager;
import org.researchspace.secrets.DefaultSecretsStore;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsStore;
import org.researchspace.services.storage.MainPlatformStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StorageRegistry;

import com.google.inject.AbstractModule;
import com.google.inject.Singleton;

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
