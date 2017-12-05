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
import java.io.FileFilter;
import java.util.List;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.ConfigurationParameter;
import com.metaphacts.config.InvalidConfigurationException;
import com.metaphacts.security.ShiroGuiceModule.ShiroFilter;

/**
 * Configuration group for all deployment-specific configuration options, 
 * such as server URLs, keys, etc.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class EnvironmentConfiguration extends ConfigurationGroupBase {

    private final String runtimeDirectory;
    
    private final static String ID = "environment";
    
    // TODO: outline using locale
    private final static String DESCRIPTION = 
        "The environment group contains all deployment-specific "
        + "configuration options, such as server URLs, keys, etc.";
    
    public EnvironmentConfiguration(final String runtimeDirectory) throws InvalidConfigurationException {
        
        super(ID, DESCRIPTION, ConfigurationBackingFileType.prop);
        this.runtimeDirectory = runtimeDirectory;
    }

    
    /***************************************************************************
     ************************ CONFIGURATION OPTIONS ****************************
     **************************************************************************/
    @ConfigurationParameter
    public String getSparqlEndpoint() {
        return getString("sparqlEndpoint");
    }
    
    /***************************** DIRECTORIES ********************************/
    @ConfigurationParameter    
    public String getAppsDirectory() {
        return getString("appsDirectory", runtimeDirectory + "/apps/");
    }

    /**
     * storage location used by file upload component
     */
    public String getFileUploadLocation(final String type) {
        return getString("upload-" + type);
    }

    /***************************** URL MAPPINGS *******************************/
    @ConfigurationParameter
    public String getResourceUrlMapping(){
        return getString("resourceUrlMapping", "/resource/");
    }
    
    @ConfigurationParameter
    public String getPagesUrlMapping(){
        return getString("pagesUrlMapping", "/page/");
    }
    
    @ConfigurationParameter
    public String getPlatformBaseIri() {
        return getString("platformBaseIri");
    }

    @ConfigurationParameter
    public List<String> getPathsToRewrite() {
        return getStringList("pathsToRewrite", Lists.newArrayList());
    }


    /**************************** AUTHENTICATION ******************************/
    @ConfigurationParameter
    public String getShiroConfig() {
        return getString("shiroConfig", 
                         Configuration.getConfigBasePath() +  "shiro.ini");
    }

    @ConfigurationParameter
    public String getShiroLDAPConfig() {
        return getString("shiroLDAPConfig", 
                         Configuration.getConfigBasePath() +  "shiro-ldap.ini");
    }

    @ConfigurationParameter
    public List<String> getShiroAuthenticationFilter() {
        return getStringList("shiroAuthenticationFilter", 
                             Lists.newArrayList(ShiroFilter.authcBasic.name(), ShiroFilter.authc.name()));
    }
    
    @ConfigurationParameter
    public Integer getShiroSessionTimeoutSecs() {
        return getInteger("shiroSessionTimeoutSecs", 1800 /* = 30 mins */);
    }
    
    /**************************** SPARQL HTTP CLIENT PARAMETERS ***************/
    @ConfigurationParameter
    public Integer getMaxSparqlHttpConnections() {
        return getInteger("maxSparqlHttpConnections", 10);
    }
    
    /**
     * SPARQL HTTP connection timeout (in seconds)
     * 
     * @return
     */
    @ConfigurationParameter
    public Integer getSparqlHttpConnectionTimeout() {
        return getInteger("sparqlHttpConnectionTimeout");
    }

    /**************************** HELPER METHOD *******************************/
    public List<File> getApplicationFolders(){
        File appDir = new File(getAppsDirectory());
        if(!appDir.exists()) return Lists.<File>newArrayList();
        File[] applicationDirs = appDir.listFiles(new FileFilter() {
            @Override
            public boolean accept(File pathname) {return pathname.isDirectory();}
        });
        return Lists.newArrayList(applicationDirs);
    }
    
    /****************************** VALIDATION ********************************/
    @Override
    public void assertConsistency() {
        // TODO: implement syntactic checks for date and time pattern
    }
    
}
