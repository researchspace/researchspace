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

import java.io.IOException;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.ServletContext;

import com.metaphacts.services.fields.FieldDefinitionManager;
import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.DefaultPasswordService;
import org.apache.shiro.authc.credential.PasswordMatcher;
import org.apache.shiro.authc.credential.PasswordService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.Maps;
import com.google.inject.AbstractModule;
import com.google.inject.Injector;
import com.google.inject.Provider;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.google.inject.multibindings.Multibinder;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.cache.QueryTemplateCache;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.data.rdf.container.LDPApiInternalRegistry;
import com.metaphacts.data.rdf.container.LDPAssetsLoader;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.data.rdf.container.PermissionsAwareLDPApiRegistry;
import com.metaphacts.federation.repository.MpSparqlServiceRegistry;
import com.metaphacts.querycatalog.QueryCatalogRESTServiceRegistry;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.ShiroTextRealm;
import com.metaphacts.services.fields.FieldsBasedSearch;
import com.metaphacts.servlet.MProxyServlet;
import com.metaphacts.servlet.SparqlServlet;
import com.metaphacts.thumbnails.DefaultThumbnailService;
import com.metaphacts.thumbnails.ThumbnailServiceRegistry;
import com.metaphacts.ui.templates.MainTemplate;
import com.metaphacts.upload.UploadHandler;
import com.metaphacts.upload.handlers.FileUploadHandler;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class MainGuiceModule extends AbstractModule {

    @SuppressWarnings("unused")
    private Injector coreInjector;

    private ServletContext servletContext;

    public MainGuiceModule(ServletContext servletContext, Injector coreInjector){
        this.coreInjector=coreInjector;
        this.servletContext = servletContext;
    }


    @Override
    protected void configure() {
        // need to bind shiro stuff already here because it will be accessed in REST endpoint
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

        //file upload url processors
        Multibinder<UploadHandler> uriBinder = Multibinder.newSetBinder(binder(), UploadHandler.class);
        uriBinder.addBinding().to(FileUploadHandler.class);
    }

    /**
     * When bundling client-side assets with webpack we attach bundle hash to
     * every file to make sure that browser cache is reset when we deploy new version.
     * see webpack.dll.prod.js and webpack.prod.config.js for more details.
     */
    @Provides
    @Singleton
    @Named("ASSETS_MAP")
    public Map<String, String> getAssetsMap() throws IOException {
        this.servletContext.getResourceAsStream("/assets/dll-manifest.json");
        ObjectMapper mapper = new ObjectMapper();
        JsonNode dllManifest = mapper.readTree(
            this.servletContext.getResourceAsStream("/assets/dll-manifest.json")
        );
        ObjectNode appManifest = (ObjectNode)mapper.readTree(
            this.servletContext.getResourceAsStream("/assets/bundles-manifest.json")
        );

        Map<String, String> map = Maps.newLinkedHashMap();
        map.put("vendor", dllManifest.get("vendor").get("js").asText());
        map.put("basic_styling", dllManifest.get("basic_styling").get("css").asText());

        Iterator<Map.Entry<String, JsonNode>> iterator = appManifest.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            String bundleName = entry.getKey();
            JsonNode bundlePath = entry.getValue().get("js");
            if (bundlePath == null || !bundlePath.isTextual()) {
                throw new IllegalStateException(
                    "Invalid value for bundle name '" + bundleName + "' in bundles-manifest.json");
            }
            map.put(bundleName, bundlePath.asText());
        }

        return Collections.unmodifiableMap(map);
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
