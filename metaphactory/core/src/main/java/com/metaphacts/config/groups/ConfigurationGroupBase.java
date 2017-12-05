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

package com.metaphacts.config.groups;

import java.io.File;
import java.util.Arrays;
import java.util.List;

import jersey.repackaged.com.google.common.base.Throwables;

import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.sync.ReadWriteSynchronizer;
import org.apache.commons.lang.NotImplementedException;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.ConfigurationUtil;
import com.metaphacts.config.InvalidConfigurationException;


/**
 * Base class providing common functionality for the {@link ConfigurationGroup}
 * interface. This includes locating the file (based on the backing file type,
 * but prospectively also other metadata such as a list of lookup directories),
 * loading it into a backing apache commons configuration object, and providing
 * generic lookup (and, prospectively, serialization) capabilities.
 * 
 * The way this works is that the {@link ConfigurationGroupBase} objects contains
 * a {@link FileBasedConfigurationBuilder} as a backing object, to which it
 * delegates.
 *  
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public abstract class ConfigurationGroupBase implements ConfigurationGroup {

    private static final Logger logger =  LogManager.getLogger(ConfigurationGroupBase.class);   

    
    /**
     * ID of the configuration group
     */
    private final String id;
    
    /**
     * Description of the configuration group
     */
    private final String description;
    
    /**
     * The internal configuration builder
     */
    private FileBasedConfigurationBuilder<PropertiesConfiguration> configBuilder;
    

    /**
     * Type of file backing the configuration
     */
    final private ConfigurationBackingFileType backingFileType;
    
    public ConfigurationGroupBase(
        final String id, final String description, 
        final ConfigurationBackingFileType backingFileType) throws InvalidConfigurationException {
        
        this.id = id;
        this.description = description;
        this.backingFileType = backingFileType;
        
        ////// basic consistency checking
        if (StringUtils.isEmpty(id)) {
            throw new InvalidConfigurationException(
                "Configuration group ID must not be null or empty.");
        }

        if (StringUtils.isEmpty(description)) {
            throw new InvalidConfigurationException(
                "Configuration group description must not be null or empty.");
        }
        
        if (backingFileType == null) {
            throw new InvalidConfigurationException(
                "Backing file type for configuration group is null.");
        }
        
        // initialization
        try {
            
            init();
            
        } catch (ConfigurationException e) {

            // wrap into internal exception
            throw new InvalidConfigurationException(e);
            
        }
        
        // soundness and completeness check
        assertConsistency();
    }
    
    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getDescription() {
        return description;
    }

    @Override
    public ConfigurationBackingFileType getBackingFileType() {
        return backingFileType;
    }

    /**
     * Method to be overridden in order to assert that the configuration
     * parameters are consistent. This may include checks such as value space
     * restrictions for datatypes, interdependencies between parameters, etc. 
     */
    @Override
    public abstract void assertConsistency();

    
    
    /**
     * Sets the property to the new value in the runtime and serializes the
     * new property value to the backing file. 
     * 
     * @param configIdInGroup the configuration parameter name relative to the group
     * @param configValue the value of the configuration
     */
    public void setParameter(final String configIdInGroup, final String configValue) {
        
        // Note: we may want to add a check here at some point making sure that
        //       this method is not called for parameters (i.e. configIdInGroup)
        //       that are not part of the config group's signature; this could
        //       be done by inspecting the methods member variables, see the
        //       code in class Configuration.java. For now, we assume that only
        //       properties are written that also belong to the group.
        
        try {
            
            // set 
            setParameterInDelegate(configIdInGroup, configValue);
            
        } catch (Exception e) {
            
            logger.warn("Error while saving configuration: " + e.getMessage());
            throw Throwables.propagate(e);
            
        }
    }
    

    @Override
    public String getString(final String configIdInGroup) {
        return getString(configIdInGroup, null /* no fallback value */);
    }

    @Override
    public String getString(final String configIdInGroup, final String fallbackValue) {
        return getStringFromDelegate(configIdInGroup, fallbackValue);
    }

    @Override
    public Boolean getBoolean(final String configIdInGroup, final Boolean fallbackValue) {
        return getBooleanFromDelegate(configIdInGroup, fallbackValue);
    }

    @Override
    public Boolean getBoolean(final String configIdGroup) {
        return getBoolean(configIdGroup, null);
    }

    @Override
    public Integer getInteger(final String configIdInGroup) {
        return getInteger(configIdInGroup, null /* no fallback value */);
    }

    @Override
    public Integer getInteger(final String configIdInGroup, final Integer fallbackValue) {
        return getIntegerFromDelegate(configIdInGroup, fallbackValue);
    }

    @Override
    public List<String> getStringList(final String configIdInGroup) {
        return getStringList(configIdInGroup, null);
    }

    public List<String> getStringList(final String configIdInGroup, final List<String> fallbackValue) {
        return getStringListFromDelegate(configIdInGroup, fallbackValue);
    }

    /**
     * @return path to the (for now, single) backing configuration file
     */
    String configFilePath() {
        return com.metaphacts.config.Configuration.getConfigBasePath()
                + id + "." + backingFileType.toString();
    }
    
    public File getConfigFile(){
        return new File(configFilePath());
    }
    
    
    /**
     * Initialize the backing configuration object (and so the configuration
     * group itself).
     * 
     * @throws ConfigurationException 
     */
    void init() throws ConfigurationException {

        logger.info("Initializing new configuration group {}", id);
        
        switch (backingFileType) {
        case prop:
            configBuilder = ConfigurationUtil.getPropertiesConfigFromFile(getConfigFile());
            break;
        case xml:
        default: 
            throw new NotImplementedException("No XML properties file support implemented yet");
        }
        
        getConfigurationInternal().setSynchronizer(new ReadWriteSynchronizer());
        
    }
    
    /**
     * Internal save method of the configuration group base. Serializes the
     * saved value back to the backing file.
     * 
     * @throws ConfigurationException 
     */
    void setParameterInDelegate(final String configIdInGroup, final String configValue) throws ConfigurationException {

        logger.info("Saving new value: " + configIdInGroup + " -> " + configIdInGroup);
        getConfigurationInternal().setProperty(configIdInGroup, configValue);
        configBuilder.save();
               
    }
    
    final private Configuration getConfigurationInternal() {
        try {
            return configBuilder.getConfiguration();
        } catch (ConfigurationException e) {
            logger.error("Failed to extract internal configuration object: " + e.getMessage());
            throw Throwables.propagate(e);
        }
    }


    /**
     * Returns the string associated with the given property ID. Internal
     * helper method, not exposed to the outside. All access to system parameters
     * should go through this and sibling getTYPEInternal, as this method 
     * handles overrides via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current value string 
     */
    String getStringFromDelegate(final String configIdInGroup, final String fallbackValue) {
        
        final String systemPropertyName = configParamToSystemParam(configIdInGroup);
        final String systemPropertyVal = System.getProperty(systemPropertyName);
        
        return StringUtils.isEmpty(systemPropertyVal) ? 
            getConfigurationInternal().getString(configIdInGroup, fallbackValue) : 
            systemPropertyVal;        
    }

    private Boolean getBooleanFromDelegate(final String configIdInGroup, final Boolean fallbackValue) {
        final String systemPropertyName = configParamToSystemParam(configIdInGroup);
        final String systemPropertyVal = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            return Boolean.valueOf(systemPropertyVal);
        }
        // no or invalid system override for parameter resumes here:
        return getConfigurationInternal().getBoolean(configIdInGroup, fallbackValue);
    }

    /**
     * Returns the Integer associated with the given property ID. Internal
     * helper method, not exposed to the outside. All access to system parameters
     * should go through this and sibling getTYPEInternal, as this method 
     * handles overrides via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current integer value 
     */
    Integer getIntegerFromDelegate(final String configIdInGroup, final Integer fallbackValue) {
        
        final String systemPropertyName = configParamToSystemParam(configIdInGroup);
        final String systemPropertyVal = System.getProperty(systemPropertyName);
        
        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            
            try {
                return Integer.valueOf(systemPropertyVal);
            } catch (NumberFormatException e) {
                logger.warn(
                    "-D parameter override for parameter " + configIdInGroup + 
                    " provided, but not a valid integer: " + systemPropertyName + 
                    ". Parameter override will be ignored.");
            }
        }
        
        // no or invalid system override for parameter resumes here:
        return getConfigurationInternal().getInteger(configIdInGroup, fallbackValue);
    }

    /**
     * Returns the string list associated with the given property ID. Internal
     * helper method, not exposed to the outside. All access to system parameters
     * should go through this and sibling getTYPEInternal, as this method 
     * handles overrides via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current value string list
     */
    public List<String> getStringListFromDelegate(final String configIdInGroup, final List<String> fallbackValue) {
        
        final String systemPropertyName = configParamToSystemParam(configIdInGroup);
        final String systemPropertyVal = System.getProperty(systemPropertyName);
        
        if (StringUtils.isEmpty(systemPropertyVal)) {
            
            final String[] retAsArr = getConfigurationInternal().getStringArray(configIdInGroup);
            
            return retAsArr.length==0 && fallbackValue!=null ? fallbackValue : Arrays.asList(retAsArr);
            
        } else {
            
            return ConfigurationUtil.configValueAsList(systemPropertyVal);

        }
    }

    
    /**
     * Converts a config parameter for the given group to its unique
     * system parameter name. More precisely, a config parameter <PARAM> in
     * group <GROUP> is referenced via config.<GROUP>.<PARAM>. Throws an
     * {@link IllegalArgumentException} if the config parameter passed in
     * is null or empty.
     * 
     * @param configParam
     * 
     * @return the associated system parameter string
     */
    String configParamToSystemParam(final String configParam) {
        return ConfigurationUtil.configParamToSystemParam(getId(), configParam);
    }
    
    /**
     * <p>
     * Clears all existing configuration values. An invocation of this method
     * causes a new ImmutableConfiguration object to be created the next time
     * getConfiguration() is called.
     * </p>
     * <strong> 
     * !!! ONLY FOR TESTING PURPOSE. NEVER CALL THIS METHOD IN RUNTIME CODE!!!
     * </strong>
     */
    public void resetResult(){
        configBuilder.resetResult();
    }
}
