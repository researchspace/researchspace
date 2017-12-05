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

package com.metaphacts.junit;

import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Map;

import javax.inject.Named;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.io.FileUtils;

import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMap;
import com.google.inject.AbstractModule;
import com.google.inject.Injector;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.container.LDPApi;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.repository.RepositoryManager;
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
            final File tempWorkingDir = new File(FileUtils.getTempDirectory(), "metaphatory-"+nextRandom());
            tempWorkingDir.mkdir();
            
            System.setProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_DIRECTORY, tempWorkingDir.getAbsolutePath());

            // create config folder and files
            File configFolder = new File(tempWorkingDir, "/config" );
            configFolder.mkdir();
            
            System.setProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE, configFolder.getAbsolutePath());
            
            File repositoryConfigFolder = new File(configFolder,"repositories");
            FileUtils.forceMkdir(repositoryConfigFolder);

            File globalConfigFile = new File(configFolder,"global.prop");
            FileUtils.touch(globalConfigFile );

            File envConfigFile = new File(configFolder,"environment.prop");
            FileUtils.touch(envConfigFile );

            File uiConfigFile = new File(configFolder,"ui.prop");
            FileUtils.touch(uiConfigFile );

            File nsFile = new File(configFolder, "namespaces.prop");
            FileUtils.touch(nsFile);

            // create data dir
            File dataFolder = new File(tempWorkingDir, "./data" );
            dataFolder.mkdir();
            
            
            Runtime.getRuntime().addShutdownHook(new Thread() {
                @Override
                public void run() {
                  try {
                    FileUtils.deleteDirectory(tempWorkingDir);
                    System.clearProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE);
                    System.clearProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_DIRECTORY);
                } catch (IOException e) {
                    Throwables.propagate(e);
                }
                }
           });

        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        bind(com.metaphacts.config.Configuration.class).in(Singleton.class);
        bind(RepositoryManager.class).in(Singleton.class);
        bind(CacheManager.class).in(Singleton.class);
        bind(LabelCache.class).in(Singleton.class);
        bind(TemplateIncludeCache.class).in(Singleton.class);
        bind(SparqlServlet.class).in(Singleton.class);
        bind(ThumbnailServiceRegistry.class).in(Singleton.class);
        bind(DefaultThumbnailService.class).asEagerSingleton();
        bind(MainTemplate.class).in(Singleton.class);
        
        //ldp bindings
        requestStaticInjection(LDPImplManager.class);
        requestStaticInjection(LDPApi.class);
       
    }
    
    @Provides @Singleton
    public NamespaceRegistry getNamespaceRegistry(Injector injector) throws ConfigurationException { 
        NamespaceRegistry ns = new NamespaceRegistry(new File(Configuration.getConfigBasePath()));
        return ns;

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