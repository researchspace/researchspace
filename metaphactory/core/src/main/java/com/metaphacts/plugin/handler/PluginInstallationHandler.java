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

import com.metaphacts.plugin.MetaphactoryPlugin;

/**
 * Common 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public interface PluginInstallationHandler {
    // DECLARE CONSTANTS FOR FIXED PATHS INSIDE PLUGIN
    final static String PLUGIN_DATA_DIR = "data";
    final static String PLUGIN_DATA_TEMPLATES_DIR = PLUGIN_DATA_DIR + "/templates";

    final static String PLUGIN_CONFIG_DIR = "config";
    final static String PLUGIN_NAMESPACES_PROP_FILE = PLUGIN_CONFIG_DIR + "/namespaces.prop";
    
    /**
     * This will be called as soon as the plugin manager starts the extensions
     * by calling {@link MetaphactoryPlugin#start()}. All handler must implement
     * this method, for example, to implement custom logic for merging artifacts
     * such as templates and configurations.
     */
    public void install();
}