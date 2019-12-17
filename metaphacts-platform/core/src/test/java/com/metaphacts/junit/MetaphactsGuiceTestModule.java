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

package com.metaphacts.junit;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Map;

import javax.inject.Named;

import org.apache.commons.io.FileUtils;

import com.google.common.collect.ImmutableMap;
import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.querycatalog.QueryCatalogRESTServiceRegistry;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.secrets.DefaultSecretsStore;
import com.metaphacts.secrets.SecretResolver;
import com.metaphacts.secrets.SecretsStore;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.servlet.SparqlServlet;
import com.metaphacts.thumbnails.DefaultThumbnailService;
import com.metaphacts.thumbnails.ThumbnailServiceRegistry;
import com.metaphacts.ui.templates.MainTemplate;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class MetaphactsGuiceTestModule extends AbstractModule {
    private SecureRandom random = new SecureRandom();

    public String nextRandom() {
      return new BigInteger(130, random).toString(32);
    }

    @Override
    protected void configure() {
        // TODO this entire section is a ugly workaround
        try {
            Path tempWorkingDir = FileUtils.getTempDirectory().toPath()
                .resolve("metaphatory-" + nextRandom());
            Files.createDirectories(tempWorkingDir);

            System.setProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_DIRECTORY,
                tempWorkingDir.toAbsolutePath().toString());

            // create data dir
            Path dataFolder = tempWorkingDir.resolve("./data");
            Files.createDirectories(dataFolder);

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    FileUtils.deleteDirectory(tempWorkingDir.toFile());
                    System.clearProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_DIRECTORY);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        bind(TestPlatformStorage.class).in(Singleton.class);
        bind(PlatformStorage.class).to(TestPlatformStorage.class).in(Singleton.class);

        bind(com.metaphacts.config.Configuration.class).in(Singleton.class);
        bind(NamespaceRegistry.class).in(Singleton.class);
        bind(RepositoryManager.class).in(Singleton.class);
        bind(SecretResolver.class).to(SecretsStore.class).in(Singleton.class);
        bind(SecretsStore.class).to(DefaultSecretsStore.class).in(Singleton.class);
        bind(QueryCatalogRESTServiceRegistry.class).in(Singleton.class);
        bind(CacheManager.class).in(Singleton.class);
        bind(LabelCache.class).in(Singleton.class);
        bind(TemplateIncludeCache.class).in(Singleton.class);
        bind(SparqlServlet.class).in(Singleton.class);
        bind(ThumbnailServiceRegistry.class).in(Singleton.class);
        bind(DefaultThumbnailService.class).asEagerSingleton();
        bind(MainTemplate.class).in(Singleton.class);

        //ldp bindings
        requestStaticInjection(LDPImplManager.class);
        requestStaticInjection(LDPApiInternal.class);
    }

    @Provides
    @Singleton
    @Named("ASSETS_MAP")
    public Map<String, String> getAssetsMap() {
        return ImmutableMap.of(
    	    "vendor", "vendor.js",
            "basic_styling", "basic_styling.css",
            "app", "app.js",
            "hot", "hot.js"
        );
    }

}
