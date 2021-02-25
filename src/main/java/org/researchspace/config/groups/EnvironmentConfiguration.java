/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.config.groups;

import java.nio.file.Paths;
import java.util.List;

import com.google.common.collect.Lists;

import javax.inject.Inject;

import org.researchspace.config.ConfigurationParameter;
import org.researchspace.config.InvalidConfigurationException;
import org.researchspace.security.SecurityConfigRecord;
import org.researchspace.security.SecurityConfigType;
import org.researchspace.security.ShiroGuiceModule.ShiroFilter;
import org.researchspace.services.storage.api.PlatformStorage;

/**
 * Configuration group for all deployment-specific configuration options, such
 * as server URLs, keys, etc.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class EnvironmentConfiguration extends ConfigurationGroupBase {
    private final static String ID = "environment";

    // TODO: outline using locale
    private final static String DESCRIPTION = "The environment group contains all deployment-specific "
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
    public String getResourceUrlMapping() {
        return getString("resourceUrlMapping", "/resource/");
    }

    @ConfigurationParameter
    public String getPagesUrlMapping() {
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
     * If specified, all security configuration files will be loaded from specified
     * storage.
     * 
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
     * SSO variant, currently we only support "keycloak" and "oidc".
     */
    @ConfigurationParameter
    public String getSso() {
        return getString("sso");
    }

    /**
     * Returns {@link SecurityConfigRecord} for specified config type.
     * <ul>
     * <li>if {@link #getSecurityConfigStorageId()} is defined then the platform
     * will use storage to read/write the config files;</li>
     * <li>otherwise filesystem and corresponding config parameters (e.g.
     * {@link #getShiroConfig()}) will be used.</li>
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


    /**
     * @deprecated we shouldn't manipulate auth filters from the config, filter chain should be adjusted automatically based on the auth method user select
     */
    @ConfigurationParameter
    public List<String> getShiroAuthenticationFilter() {
        return getStringList("shiroAuthenticationFilter",
                Lists.newArrayList(ShiroFilter.authcBasic.name(), ShiroFilter.authc.name()));
    }

    @ConfigurationParameter
    public Integer getShiroSessionTimeoutSecs() {
        return getInteger("shiroSessionTimeoutSecs", -1 /* = infinite */);
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
     * This value is used to set both <b>http.connection.timeout</b> (timeout for
     * establishing the connection) and <b>http.socket.timeout</b> (timeout for
     * waiting for the data) parameters of the Apache HttpClient.
     *
     * Note that the Operation#setMaxExecutionTime method of RDF4J sets only the
     * <b>http.socket.timeout</b> parameter (see SparqlOperationBuilder).
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
     * A valid cross origin pattern to enable CORS By default returns
     * <code>null</null> i.e. CORS should not be enabled by default.
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
