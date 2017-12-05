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

import java.util.List;

/**
 * A configuration group, summarizing thematically grouped configurations.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public interface ConfigurationGroup {
    
    /**
     * Backing file type for the configuration group. Note that this coincides
     * with the file endings (*.prop, *.xml) and we're using toString(), so
     * do not rename the enum members.
     */
    public enum ConfigurationBackingFileType {
        prop, /* .prop file underlying */
        xml   /* .xml file underlying */
    }
    
    /**
     * @return the unique ID of the configuration group
     */
    public String getId();
    
    /**
     * @return the description of the configuration group
     */
    public String getDescription();
    
    /**
     * Asserts that the configuration is semantically sound and complete,
     * i.e. that required parameters are given etc.
     */
    public void assertConsistency();
    
    /**
     * The type of file(s) backing the configuration.
     */
    public ConfigurationBackingFileType getBackingFileType();
    
    
    
    /**
     * Returns the value of the parameter interpreted as a string. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @param configIdInGroup the configuration parameter name relative to the group
     * @return the current string value of the parameter or the fallback value,
     *          in case the parameter value is undefined
     */
    public String getString(final String configIdInGroup);
    
    /**
     * Returns the value of the parameter interpreted as an integer. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a valid system parameter, the override will be returned.
     * 
     * @param configIdInGroup the configuration parameter name relative to the group
     * @param fallbackValue the fallback value
     * @return the current string value of the parameter of the 
     */
    public Integer getInteger(final String configIdInGroup, final Integer fallbackValue);

    /**
     * Returns the value of the parameter interpreted as an integer. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a valid system parameter, the override will be returned.
     * 
     * @param configIdInGroup the configuration parameter name relative to the group
     * @return the current string value of the parameter or the fallback value,
     *          in case the parameter value is undefined
     */
    public Integer getInteger(final String configIdInGroup);
    
    /**
     * Returns the value of the parameter interpreted as a string. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @param configIdInGroup the configuration parameter name relative to the group
     * @param fallbackValue the fallback value
     * @return the current string value of the parameter of the 
     */
    public String getString(final String configIdInGroup, final String fallbackValue);    

    /**
     * Returns the value of the parameter interpreted as a boolean.
     *
     * @see ConfigurationGroup#getString(String)
     */
    public Boolean getBoolean(final String configIdGroup);

    /**
     * Returns the value of the parameter interpreted as a boolean.
     *
     * @see ConfigurationGroup#getString(String, String)
     */
    public Boolean getBoolean(final String configIdInGroup, final Boolean fallbackValue);
   
    /**
     * Returns the configuration parameter by (group-specific) name or null
     * if the configuration parameter is not defined. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @return The parameters is returned as a List<String>. If the value has no String
     * @param fallbackValue the fallback value
     * @return array representation or the parameter is not set, the method returns null.
     */    
    public List<String> getStringList(final String paramName);
    
    /**
     * Returns the configuration parameter by (group-specific) name or dfltValue
     * if the configuration parameter is not defined. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @return the parameter value is returned as a List<String>. If the value has no String
     *          Array representation or the parameter is not set, the method returns the
     *          dfltValue passed in as a second parameter.
     */    
    public List<String> getStringList(final String paramName, final List<String> fallbackValue);
    
}
