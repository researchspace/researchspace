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

import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Map;

import javax.inject.Named;

import org.apache.commons.io.FileUtils;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.LabelCache;
import org.researchspace.cache.TemplateIncludeCache;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LDPImplManager;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistry;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.secrets.DefaultSecretsStore;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsStore;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.servlet.SparqlServlet;
import org.researchspace.thumbnails.DefaultThumbnailService;
import org.researchspace.thumbnails.ThumbnailServiceRegistry;
import org.researchspace.ui.templates.MainTemplate;

import com.google.common.collect.ImmutableMap;
import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.Singleton;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class ResearchSpaceGuiceTestModule extends AbstractModule {
    private SecureRandom random = new SecureRandom();

    public String nextRandom() {
        return new BigInteger(130, random).toString(32);
    }

    @Override
    protected void configure() {
        // TODO this entire section is a ugly workaround
        try {
            Path tempWorkingDir = FileUtils.getTempDirectory().toPath().resolve("metaphatory-" + nextRandom());
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

        bind(org.researchspace.config.Configuration.class).in(Singleton.class);
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

        // ldp bindings
        requestStaticInjection(LDPImplManager.class);
        requestStaticInjection(LDPApiInternal.class);
    }

    @Provides
    @Singleton
    @Named("ASSETS_MAP")
    public Map<String, String> getAssetsMap() {
        return ImmutableMap.of("vendor", "vendor.js", "basic_styling", "basic_styling.css", "app", "app.js", "hot",
                "hot.js");
    }

}
