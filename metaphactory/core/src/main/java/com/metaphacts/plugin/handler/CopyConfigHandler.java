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
 * Handler to copy only <strong>non-existing</strong> configuration properties
 * from plugin configuration property files to platform configuration property files.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class CopyConfigHandler extends ConfigBaseInstallationHandler {
    private static final Logger logger = LogManager.getLogger(CopyConfigHandler.class);
    
    public CopyConfigHandler(Configuration config, Path pluginBasePath) {
        super(config, pluginBasePath);
    }

    @Override
    public void merge() {
        // merging ui.prop and global.prop, merging environment.prop is not supported 
        mergeProperties(config, config.getUiConfig(), getPluginConfigDir());
        mergeProperties(config, config.getGlobalConfig(), getPluginConfigDir());
        
        File envPluginProp = getPluginConfigurationFile(config.getEnvironmentConfig());
        if(envPluginProp.exists()){
            logger.warn("Skipping {}. Environment properties can not be set by plugins.", envPluginProp.getAbsolutePath());
        }
    }
   
    private void mergeProperties(Configuration config, ConfigurationGroupBase configGroup, File pluginConfigDir){
       
        final Properties pluginProperties = new Properties();
        
        final File pluginPropFile = getPluginConfigurationFile(configGroup);
        final String propFileName = pluginPropFile.getName();
        if(pluginPropFile.exists()){
            try {
                final Properties platformProperties = new Properties();
                platformProperties.load(FileUtils.openInputStream(configGroup.getConfigFile()));
                
                pluginProperties.load(FileUtils.openInputStream(pluginPropFile));
                for( Object key : pluginProperties.keySet()){
                    // check whether the platform property file already contains this setting
                    final String prop = (String)key;
                    if(!platformProperties.containsKey(prop)){
                        try{
                            final String value = pluginProperties.getProperty((String)key);
                            config.setProperty(configGroup.getId(), prop, value);
                            logger.debug("Copied none-existing config property \"{} = {}\" to \"{}\".", prop, value, propFileName);
                        }catch (UnknownConfigurationException e) {
                            logger.error("Error while setting a configuration property in \"{}\": {}", propFileName, e.getMessage());
                        }
                    }else{
                        logger.warn("Config property \"{}\" already exists in platform \"{}\". Skipping.", prop, propFileName);
                    }
                }
            } catch (IOException e) {
                logger.error("Error while reading ui.prop file: " + e.getMessage());
            } 
        }
    }

}