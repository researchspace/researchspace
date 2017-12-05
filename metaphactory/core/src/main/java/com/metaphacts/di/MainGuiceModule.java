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

import java.io.IOException;
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.ServletContext;

import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.DefaultPasswordService;
import org.apache.shiro.authc.credential.PasswordMatcher;
import org.apache.shiro.authc.credential.PasswordService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMap;
import com.google.inject.AbstractModule;
import com.google.inject.Injector;
import com.google.inject.Provider;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.google.inject.multibindings.MapBinder;
import com.google.inject.multibindings.Multibinder;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.data.rdf.container.LDPApi;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.plugin.MetaphactoryPluginManager;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.ShiroTextRealm;
import com.metaphacts.servlet.SparqlServlet;
import com.metaphacts.thumbnails.DefaultThumbnailService;
import com.metaphacts.thumbnails.ThumbnailServiceRegistry;
import com.metaphacts.ui.templates.MainTemplate;
import com.metaphacts.upload.MetadataExtractor;
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

        bind(RepositoryManager.class).in(Singleton.class);
        bind(CacheManager.class).in(Singleton.class);
        bind(LabelCache.class).in(Singleton.class);
        bind(TemplateIncludeCache.class).in(Singleton.class);
        bind(SparqlServlet.class).in(Singleton.class);
        bind(ThumbnailServiceRegistry.class).in(Singleton.class);
        bind(DefaultThumbnailService.class).asEagerSingleton();
        
        bind(LDPImplManager.class).in(Singleton.class);
        requestStaticInjection(LDPImplManager.class);
        requestStaticInjection(LDPApi.class);

        //file upload url processors
        Multibinder<UploadHandler> uriBinder = Multibinder.newSetBinder(binder(), UploadHandler.class);
        uriBinder.addBinding().to(FileUploadHandler.class);
        // bind plugin manager
        bind(MetaphactoryPluginManager.class).in(Singleton.class);
    }

    /**
     * When bundling client-side assets with webpack we attach bundle hash to
     * every file to make sure that browser cache is reset when we deploy new version.
     * see webpack.dll.prod.js and webpack.prod.config.js for more details.
     */
    @Provides 
    @Singleton 
    @Named("ASSETS_MAP")
    public Map<String, String> getAssetsMap() {
        try {
            this.servletContext.getResourceAsStream("/assets/dll-manifest.json");
            ObjectMapper mapper = new ObjectMapper();
            JsonNode dllManifest = mapper.readTree(
                this.servletContext.getResourceAsStream("/assets/dll-manifest.json")
            );
            JsonNode appManifest = mapper.readTree(
                this.servletContext.getResourceAsStream("/assets/bundles-manifest.json")
            );
            String hotModule = dllManifest.has("hot") 
                 ? dllManifest.get("hot").get("js").asText() : "";
            return ImmutableMap.of(
                "vendor", dllManifest.get("vendor").get("js").asText(),
                "basic_styling", dllManifest.get("basic_styling").get("css").asText(),
                "app", appManifest.get("app").get("js").asText(),
                "apiCommons", appManifest.get("api-commons").get("js").asText(),
                "hot", hotModule
            );
        } catch (IOException e) {
            throw Throwables.propagate(e);
        }
    }

    
    public static class MainTemplateProvider implements Provider<String> {
        @Inject
        private MainTemplate mainTemplate;

        @Override
        public String get() {
            return mainTemplate.getMainTemplate();
        }

    }
}
