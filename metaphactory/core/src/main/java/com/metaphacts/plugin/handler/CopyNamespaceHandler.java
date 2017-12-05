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

import java.nio.file.Path;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.NamespaceRegistry.ProtectedNamespaceDeletionException;

/**
 * Handler to copy only <strong>non-existing</strong> namespace entries from
 * plugin to platform namespace registry.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class CopyNamespaceHandler extends NamespaceBaseInstallationHandler {
    private static final Logger logger = LogManager.getLogger(CopyNamespaceHandler.class);
    
    public CopyNamespaceHandler(Configuration config,
            NamespaceRegistry namespaceRegistry, Path pluginBasePath) {
        super(config, namespaceRegistry, pluginBasePath);
    }

    @Override
    protected void merge(NamespaceRegistry namespaceRegistry, String key, String value) {
        if (namespaceRegistry.getNamespace(key).isPresent()) {
            logger.debug("Plugin namespace {} already exists in platform namespaces. Skipping.", key);
        } else {
            try {
                namespaceRegistry.set(key, value);
                logger.debug("Added new namespace {}:<{}> to platform namespaces.", key, value);
            } catch (ProtectedNamespaceDeletionException | ConfigurationException e) {
                logger.error("Error while setting namespace {}:<{}>: {}. Skipping.", key, value, e.getMessage());
            }
        }
    }

}