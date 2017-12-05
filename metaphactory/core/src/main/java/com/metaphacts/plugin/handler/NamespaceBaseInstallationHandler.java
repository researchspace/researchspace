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

package com.metaphacts.plugin.handler;

import java.io.File;
import java.nio.file.Path;
import java.util.Iterator;

import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.ConfigurationUtil;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.NamespaceRegistry.ProtectedNamespaceDeletionException;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public abstract class NamespaceBaseInstallationHandler extends PluginBaseInstallationHandler{
    private static final Logger logger = LogManager.getLogger(NamespaceBaseInstallationHandler.class);
    private final NamespaceRegistry namespaceRegistry;
    public NamespaceBaseInstallationHandler(final Configuration config,  final NamespaceRegistry namespaceRegistry, final Path pluginBasePath) {
            super(config, pluginBasePath);
            this.namespaceRegistry = namespaceRegistry;
        }
    
    public final void install(){
        final File namespaceFile = getPluginNamespaceProp();

        if (namespaceFile.exists()) {
            
            final NamespaceRegistry namespaceRegistry = getPlatformNamespaceRegistry();
            
            final FileBasedConfigurationBuilder<PropertiesConfiguration> props =
                ConfigurationUtil.getPropertiesConfigFromFile(namespaceFile);

            try {
                
                PropertiesConfiguration configuration = props.getConfiguration();
                Iterator<String> keys = configuration.getKeys();
                while(keys.hasNext()) {
                    final String key = keys.next();
                    final String value = configuration.getString(key);
                    merge(namespaceRegistry, key, value);
                }
                
            } catch (ConfigurationException | ProtectedNamespaceDeletionException e) {
                logger.warn("Error while bootstrapping namespaces: " + e.getMessage());
            }
            
        } else {
            logger.debug("No namespaces in plugin to bootstrap.");
        }
    }
    
    /**
     * 
     * @param namespaceRegistry
     * @param key
     * @param value
     * @throws ConfigurationException 
     */
    protected abstract void merge(NamespaceRegistry namespaceRegistry, String key, String value) throws ConfigurationException;
    
    /**
     * @return the platform's namespace registry
     */
    protected final NamespaceRegistry getPlatformNamespaceRegistry() {
        return namespaceRegistry;
    }
}