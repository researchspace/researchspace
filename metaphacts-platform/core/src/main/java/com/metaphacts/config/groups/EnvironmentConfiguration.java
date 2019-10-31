/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import java.nio.file.Paths;
import java.util.List;

import com.google.common.collect.Lists;
import com.metaphacts.config.ConfigurationParameter;
import com.metaphacts.config.InvalidConfigurationException;
import com.metaphacts.security.SecurityConfigType;
import com.metaphacts.security.SecurityConfigRecord;
import com.metaphacts.security.ShiroGuiceModule.ShiroFilter;
import com.metaphacts.services.storage.api.PlatformStorage;

import javax.inject.Inject;

/**
 * Configuration group for all deployment-specific configuration options,
 * such as server URLs, keys, etc.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class EnvironmentConfiguration extends ConfigurationGroupBase {
    private final static String ID = "environment";

    // TODO: outline using locale
    private final static String DESCRIPTION =
        "The environment group contains all deployment-specific "
        + "configuration options, such as server URLs, keys, etc.";

    @Inject
    public EnvironmentConfiguration(PlatformStorage platformStorage) throws InvalidConfigurationException {
        super(ID, DESCRIPTION, platformStorage);
    }


    /***************************************************************************
     ************************ CONFIGURATION OPTIONS ****************************
     **************************************************************************/

    @ConfigurationParameter
    public String getSparqlEndpoint() {
        return getString("sparqlEndpoint");
    }

    /***************************** DIRECTORIES ********************************/

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

    /**
     * If specified, all security configuration files will be loaded from specified storage.
     * @see #getSecurityConfig(SecurityConfigType)
     */
    @ConfigurationParameter
    public String getSecurityConfigStorageId() {
        return getString("securityConfigStorageId");
    }

    private String getConfigFilePath(SecurityConfigType type) {
        return getString(type.getParamKey(), type.getDefaultPath());
    }

    /**
     * Returns {@link SecurityConfigRecord} for specified config type.
     * <ul>
     *   <li>if {@link #getSecurityConfigStorageId()} is defined then the platform will use
     *   storage to read/write the config files;</li>
     *   <li>otherwise filesystem and corresponding config parameters
     *   (e.g. {@link #getShiroConfig()}) will be used.</li>
     * </ul>
     */
    public SecurityConfigRecord getSecurityConfig(SecurityConfigType type) {
        String storageId = getSecurityConfigStorageId();
        if (storageId == null) {
            return SecurityConfigRecord.fromFilesystem(type, Paths.get(getConfigFilePath(type)));
        } else {
            return SecurityConfigRecord.fromStorage(type, platformStorage, storageId);
        }
    }

    @ConfigurationParameter
    public String getShiroConfig() {
        return getConfigFilePath(SecurityConfigType.ShiroConfig);
    }

    @ConfigurationParameter
    public String getShiroLDAPConfig() {
        return getConfigFilePath(SecurityConfigType.ShiroLDAPConfig);
    }


    @ConfigurationParameter
    public String getOauthParameters() {
        return getConfigFilePath(SecurityConfigType.OauthParameters);
    }

    @ConfigurationParameter
    public String getSamlParameters() {
        return getConfigFilePath(SecurityConfigType.SamlParameters);
    }

    @ConfigurationParameter
    public String getSsoAuthConfigOverride() {
        return getConfigFilePath(SecurityConfigType.SsoAuthConfigOverride);
    }

    @ConfigurationParameter
    public String getSsoUsersConfig() {
        return getConfigFilePath(SecurityConfigType.SsoUsersConfig);
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

    /**
     * Use local users from shiro.ini even if sso/ldap is in use.
     */
    @ConfigurationParameter
    public Boolean isEnableLocalUsers() {
        return getBoolean("enableLocalUsers", false);
    }

    /**************************** SPARQL HTTP CLIENT PARAMETERS ***************/
    @ConfigurationParameter
    public Integer getMaxSparqlHttpConnections() {
        return getInteger("maxSparqlHttpConnections", 10);
    }

    /**
     * SPARQL HTTP connection timeout (in seconds).
     *
     * This value is used to set both <b>http.connection.timeout</b>
     * (timeout for establishing the connection)
     * and <b>http.socket.timeout</b> (timeout for waiting for the data)
     * parameters of the Apache HttpClient.
     *
     * Note that the Operation#setMaxExecutionTime method of RDF4J
     * sets only the <b>http.socket.timeout</b> parameter
     * (see SparqlOperationBuilder).
     *
     * Default: null (infinite)
     *
     * @return
     */
    @ConfigurationParameter
    public Integer getSparqlHttpConnectionTimeout() {
        return getInteger("sparqlHttpConnectionTimeout");
    }

    /**
     * A valid cross origin pattern to enable CORS
     * By default returns <code>null</null> i.e. CORS should not be enabled by default.
     *
     * @return
     */
    @ConfigurationParameter
    public String getAllowedCrossOrigin() {
        return getString("allowedCrossOrigin");
    }

    /****************************** VALIDATION ********************************/
    @Override
    public void assertConsistency() {
        // TODO: implement syntactic checks for date and time pattern
    }

}
