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

package com.metaphacts.config;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.ConfigurationBuilder;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.builder.fluent.Parameters;
import org.apache.commons.configuration2.convert.DefaultListDelimiterHandler;
import org.apache.commons.configuration2.convert.ListDelimiterHandler;
import org.apache.commons.configuration2.sync.ReadWriteSynchronizer;
import org.apache.commons.lang.NotImplementedException;
import org.apache.commons.lang.StringUtils;

/**
 * Utility class for configuration management. Contains methods for setting
 * up configuration builders as well as generic string manipulation and
 * conversion methods related to configuration management
 * 
 * 
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class ConfigurationUtil {

    /**
     * Return a comma-based delimiter handler, which is what we use for encoding
     * arrays in the configuration.
     * 
     * @return the list delimiter handler used by the configuration
     */
    public static ListDelimiterHandler commaBasedDelimiterHandler() {
        return new DefaultListDelimiterHandler(',');
    }
    
    /**
     * Splits the configuration value to a list using the commonly used 
     * {@link DefaultListDelimiterHandler}.
     * 
     * @param val
     * @return a list of objects
     */
    public static List<String> configValueAsList(final String val) {
        
        final ListDelimiterHandler delimHandler = ConfigurationUtil.commaBasedDelimiterHandler();
        return new ArrayList<String>(delimHandler.split(val, true));
        
    }
    
    /**
     * Returns a file based configuration builder for properties files, using
     * UTF-8 as file encoding and a comma-based delimiter handler. The builder
     * is set up to auto-synch changes back to the single backing file.
     * 
     * @param file handle to the underlying file
     * @return the configuration builder
     */
    @SuppressWarnings({"unchecked", "rawtypes" })
    static public FileBasedConfigurationBuilder<PropertiesConfiguration> getPropertiesConfigFromFile(final File file) {
        Parameters params = new Parameters();
        FileBasedConfigurationBuilder<PropertiesConfiguration> builder =
                new FileBasedConfigurationBuilder<PropertiesConfiguration>(PropertiesConfiguration.class)
                        .configure(params.properties()
                                        .setSynchronizer(new ReadWriteSynchronizer())
                                        .setListDelimiterHandler(commaBasedDelimiterHandler())
                                        .setFile(file)
                                        .setEncoding("UTF-8")
                        );
        builder.setAutoSave(true);
        
        return  (FileBasedConfigurationBuilder)builder;
    }
    
    /**
     * Returns a file based configuration builder for XML config files, using
     * UTF-8 as file encoding and a comma-based delimiter handler. The builder
     * is set up to auto-synch changes back to the single backing file.
     * 
     * @param file handle to the underlying file
     * @return the configuration builder
     */
    static public ConfigurationBuilder<Configuration> getXMLConfigFromFile(File file) {
        throw new NotImplementedException(); // TODO: implement
    }

    
    /**
     * Converts a config parameter for the given group ID its unique
     * system parameter name. More precisely, a config parameter <PARAM> in
     * group <GROUP> is referenced via config.<GROUP>.<PARAM>. Throws an
     * {@link IllegalArgumentException} if the config parameter passed in
     * is null or empty.
     * 
     * @param groupId the ID of the group the parameter belongs to
     * @param configParam the ID of the parameter itself
     * 
     * @return the associated system parameter string
     */
    public static String configParamToSystemParam(final String groupId, final String configParam) {
        
        if (StringUtils.isEmpty(configParam))
            throw new IllegalArgumentException();
        
        final StringBuilder sb = new StringBuilder();
        sb.append("config.").append(groupId).append(".").append(configParam);
        
        return sb.toString();
    }
}