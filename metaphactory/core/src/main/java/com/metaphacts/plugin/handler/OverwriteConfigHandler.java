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
import java.io.IOException;
import java.nio.file.Path;
import java.util.Properties;

import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.UnknownConfigurationException;
import com.metaphacts.config.groups.ConfigurationGroupBase;

/**
 * Handler to copy configuration properties from plugin configuration property
 * files to platform configuration property files.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class OverwriteConfigHandler extends ConfigBaseInstallationHandler {
    private static final Logger logger = LogManager.getLogger(OverwriteConfigHandler.class);
    
    public OverwriteConfigHandler(Configuration config, Path pluginBasePath) {
        super(config, pluginBasePath);
    }

    @Override
    public void merge() {
        // merging ui.prop and global.prop, merging environment.prop is not supported 
        overrideProperties(config, config.getUiConfig(), getPluginConfigDir());
        overrideProperties(config, config.getGlobalConfig(), getPluginConfigDir());
        
        File envPluginProp = getPluginConfigurationFile(config.getEnvironmentConfig());
        if(envPluginProp.exists()){
            logger.warn("Skipping {}. Environment properties can not be set by plugins.", envPluginProp.getAbsolutePath());
        }
    }

    private void overrideProperties(Configuration config, ConfigurationGroupBase configGroup, File pluginConfigDir) {
        Properties pluginProperties = new Properties();

        File pluginPropFile = getPluginConfigurationFile(configGroup);
        final String propFileName = pluginPropFile.getName();
        if(pluginPropFile.exists()){
            try {
                final Properties platformProperties = new Properties();
                platformProperties.load(FileUtils.openInputStream(configGroup.getConfigFile()));
                
                pluginProperties.load(FileUtils.openInputStream(pluginPropFile));
                for( Object key : pluginProperties.keySet()){
                    final String prop = (String)key;
                    try {
                        final boolean alreadyContained = platformProperties.containsKey(prop);
                        
                        final String value = pluginProperties.getProperty((String)key);
                        config.setProperty(configGroup.getId(),(String)key, pluginProperties.getProperty((String)key));
                        
                        if(alreadyContained){
                            logger.debug("Did overwrite config property \"{} = {}\" in \"{}\".", prop, value, propFileName);
                        }else{
                            logger.debug("Copied none-existing config property \"{} = {}\" to \"{}\".", prop, value, propFileName);
                        }
                        
                    } catch (UnknownConfigurationException e) {
                        logger.error("Error while setting a configuration property in \"{}\": {}", propFileName, e.getMessage());
                    }
                }
            } catch (IOException e) {
                logger.warn("Error while reading ui.prop file from plugin properties: " + e.getMessage());
            }
        }
        
    }
}