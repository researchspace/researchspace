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

import com.metaphacts.config.Configuration;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public abstract class PluginBaseInstallationHandler implements PluginInstallationHandler {
    protected final Configuration config;

    private final Path pluginBasePath;

    public PluginBaseInstallationHandler(final Configuration config, final Path pluginBasePath) {
        this.config = config;
        this.pluginBasePath = pluginBasePath;
    }

    /**
     * @return the plugin's template directory.
     */
    File getPluginTemplateDir() {
        return new File(getPluginDir(), PLUGIN_DATA_TEMPLATES_DIR);
    }

    /**
     * @return the plugin's template directory.
     */
    File getPluginConfigDir() {
        return new File(getPluginDir(), PLUGIN_CONFIG_DIR);
    }

    /**
     * @return the file to namespaces.prop in the plugin
     */
    File getPluginNamespaceProp() {
        return new File(getPluginDir(), PluginInstallationHandler.PLUGIN_NAMESPACES_PROP_FILE);
    }

    /**
     * @return the platform's config dir
     */
    File getPlatformConfigDir() {
        return new File(Configuration.getConfigBasePath());
    }

    
    /**
     * @return the plugin directory.
     */
    private File getPluginDir() {
        return pluginBasePath.toFile();
    }


}