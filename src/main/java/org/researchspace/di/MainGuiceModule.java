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

import java.io.IOException;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;
import javax.servlet.ServletContext;

import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.DefaultPasswordService;
import org.apache.shiro.authc.credential.PasswordMatcher;
import org.apache.shiro.authc.credential.PasswordService;
import org.researchspace.cache.LabelCache;
import org.researchspace.cache.QueryTemplateCache;
import org.researchspace.cache.TemplateIncludeCache;
import org.researchspace.config.Configuration;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LDPApiInternalRegistry;
import org.researchspace.data.rdf.container.LDPAssetsLoader;
import org.researchspace.data.rdf.container.LDPImplManager;
import org.researchspace.data.rdf.container.PermissionsAwareLDPApiRegistry;
import org.researchspace.federation.repository.MpSparqlServiceRegistry;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistry;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.security.ShiroTextRealm;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.fields.FieldsBasedSearch;
import org.researchspace.servlet.MProxyServlet;
import org.researchspace.servlet.SparqlServlet;
import org.researchspace.thumbnails.DefaultThumbnailService;
import org.researchspace.thumbnails.ThumbnailServiceRegistry;
import org.researchspace.ui.templates.MainTemplate;
import org.researchspace.upload.UploadHandler;
import org.researchspace.upload.handlers.FileUploadHandler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.inject.AbstractModule;
import com.google.inject.Injector;
import com.google.inject.Provider;
import com.google.inject.Singleton;
import com.google.inject.multibindings.Multibinder;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class MainGuiceModule extends AbstractModule {

    @SuppressWarnings("unused")
    private Injector coreInjector;

    private ServletContext servletContext;

    public MainGuiceModule(ServletContext servletContext, Injector coreInjector) {
        this.coreInjector = coreInjector;
        this.servletContext = servletContext;
    }

    @Override
    protected void configure() {
        // need to bind shiro stuff already here because it will be accessed in REST
        // endpoint
        bind(CredentialsMatcher.class).to(PasswordMatcher.class);
        bind(PasswordService.class).to(DefaultPasswordService.class);
        bind(ShiroTextRealm.class).in(Singleton.class);

        bind(MainTemplate.class).in(Singleton.class);
        requestStaticInjection(MainTemplateProvider.class);
        bind(MpSparqlServiceRegistry.class).in(Singleton.class);

        bind(RepositoryManager.class).in(Singleton.class);
        bind(LDPApiInternalRegistry.class).in(Singleton.class);
        bind(PermissionsAwareLDPApiRegistry.class).in(Singleton.class);
        bind(QueryTemplateCache.class).in(Singleton.class);
        bind(QueryCatalogRESTServiceRegistry.class).in(Singleton.class);
        bind(LabelCache.class).in(Singleton.class);
        bind(TemplateIncludeCache.class).in(Singleton.class);
        bind(SparqlServlet.class).in(Singleton.class);
        bind(MProxyServlet.class).in(Singleton.class);
        bind(ThumbnailServiceRegistry.class).in(Singleton.class);
        bind(DefaultThumbnailService.class).asEagerSingleton();
        bind(FieldDefinitionManager.class).in(Singleton.class);
        bind(FieldsBasedSearch.class).in(Singleton.class);

        bind(LDPImplManager.class).in(Singleton.class);
        bind(LDPAssetsLoader.class).in(Singleton.class);

        requestStaticInjection(LDPImplManager.class);
        requestStaticInjection(LDPApiInternal.class);

        // If we are in development mode we need to make sure that ASSETS_MAP
        // is refreshed on every invocation, because it can be changed by webpack at
        // anytime.
        // But in production mode it can be populated only once and reused for all
        // invocations.
        if (Configuration.isDevelopmentMode()) {
            bind(AssetsMap.class).toProvider(AssetsMapProvider.class);

            // make sure that we don't cache assets in development mode
            this.servletContext.setInitParameter("cacheControl", "max-age=0,public,no-cache");
        } else {
            bind(AssetsMap.class).toProvider(AssetsMapProvider.class).in(Singleton.class);
        }

        // file upload url processors
        Multibinder<UploadHandler> uriBinder = Multibinder.newSetBinder(binder(), UploadHandler.class);
        uriBinder.addBinding().to(FileUploadHandler.class);
    }

    /**
     * When bundling client-side assets with webpack we attach bundle hash to every
     * file to make sure that browser cache is reset when we deploy new version. See
     * webpack.prod.config.js for more details.
     */
    public static class AssetsMapProvider implements Provider<AssetsMap> {
        @Inject
        private ServletContext servletContext;

        @Override
        public AssetsMap get() {
            // Use ACCEPT_SINGLE_VALUE_AS_ARRAY because assets map value can be either array
            // or single element,
            // e.g
            // "login": {
            // "js": [
            // "/assets/runtime-bundle.js",
            // "/assets/default~login-bundle.js",
            // "/assets/login-bundle.js"
            // ],
            // "css": "/assets/default~login.css"
            // }

            ObjectMapper mapper = new ObjectMapper().enable(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY);
            Map<String, Map<String, List<String>>> appManifest;
            try {
                appManifest = mapper.readValue(this.servletContext.getResourceAsStream("/assets/bundles-manifest.json"),
                        new TypeReference<Map<String, Map<String, List<String>>>>() {
                        });
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
            return new AssetsMap(appManifest);
        }
    }

    public static class MainTemplateProvider implements Provider<String> {
        @Inject
        private MainTemplate mainTemplate;

        @Override
        public String get() {
            try {
                return mainTemplate.getMainTemplate();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
