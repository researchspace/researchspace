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
import java.io.FilenameFilter;
import java.nio.file.Path;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.groups.ConfigurationGroupBase;

/**
 * Base handler for handling configuration files. This base handler guarantees
 * that none-existing property files are always being copied from the plugin to
 * the main platform configuration directory.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public abstract class ConfigBaseInstallationHandler extends PluginBaseInstallationHandler{
    private static final Logger logger = LogManager.getLogger(ConfigBaseInstallationHandler.class);
    
    public ConfigBaseInstallationHandler(final Configuration config,  final Path pluginBasePath) {
            super(config, pluginBasePath);
    }
    
    /* This is final, since we want to guarantee that none-existing property files are always being copied.
     */
    @Override
    public final void install() {
        logger.info("Trying to copy none-existing property files from plugin to main platform config dir.");
        
        final File configSrcDir= getPluginConfigDir();
        final File configDestDir = getPlatformConfigDir();
        final FilenameFilter fileNameFilter = new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.endsWith(".prop") && !name.equalsIgnoreCase("namespaces.prop");
            }
        };
        CopyUtils.copyFromSrcDirToDstDirNoOverride(configSrcDir, configDestDir, fileNameFilter, logger);
        merge();
    }
    
     /**
     * This method will automatically be called from {@link #install()}.
     * Extensions must overwrite this, for example, to implement property merging or overwriting logic. 
     */
    protected abstract void merge();
    
    protected File getPluginConfigurationFile(ConfigurationGroupBase configGroup){
        return new File(getPluginConfigDir(), configGroup.getId()+"."+ configGroup.getBackingFileType().name());
    }
}