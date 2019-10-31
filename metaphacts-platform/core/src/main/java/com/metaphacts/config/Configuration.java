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

package com.metaphacts.config;

import java.beans.PropertyDescriptor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.UnauthorizedException;

import com.google.inject.Inject;
import com.metaphacts.config.groups.ConfigurationGroup;
import com.metaphacts.config.groups.ConfigurationGroupBase;
import com.metaphacts.config.groups.DataQualityConfiguration;
import com.metaphacts.config.groups.EnvironmentConfiguration;
import com.metaphacts.config.groups.GlobalConfiguration;
import com.metaphacts.config.groups.UIConfiguration;

/**
 * Main configuration class, providing entry points to the configuration groups
 * as well as common base functionality.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class Configuration {

    private static final Logger logger = LogManager
            .getLogger(Configuration.class);

    /**
     * The key of the system property to look-up {@link #getRuntimeDirectory()} property.
     */
    // TODO: should be private but still used in tests to set temporary runtime directory
    public static final String SYSTEM_PROPERTY_RUNTIME_DIRECTORY = "runtimeDirectory";

    /**
     * The key of the system property to look-up {@link #getConfigBasePath()} property.
     */
    private static final String SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE = "com.metaphacts.config.baselocation";

    /**
     * Default value for {@link #getConfigBasePath()} property.
     */
    private final static String DEFAULT_CONFIG_BASE_LOCATION = "config/";

    private final GlobalConfiguration globalConfig;

    private final EnvironmentConfiguration environmentConfig;

    private final UIConfiguration uiConfig;
    
    private final DataQualityConfiguration dataQualityConfig;

    /**
     * A registry of configuration groups administered by the config. The
     * registry is used for automatic lookup via the REST API.
     */
    private final Map<String, ConfigurationGroup> registry;

    @Inject
    public Configuration(
        GlobalConfiguration globalConfig,
        UIConfiguration uiConfig,
        EnvironmentConfiguration environmentConfig,
        DataQualityConfiguration dataQualityConfig
    ) {
        this.globalConfig = globalConfig;
        this.uiConfig = uiConfig;
        this.environmentConfig = environmentConfig;
        this.dataQualityConfig = dataQualityConfig;

        registry = new HashMap<>();
        registry.put(globalConfig.getId(), globalConfig);
        registry.put(uiConfig.getId(), uiConfig);
        registry.put(environmentConfig.getId(), environmentConfig);
        registry.put(dataQualityConfig.getId(), dataQualityConfig);
    }

    public static String getRuntimeDirectory() {
        String value = System.getProperty(SYSTEM_PROPERTY_RUNTIME_DIRECTORY);
        return StringUtils.isEmpty(value) ? "./" : value;
    }

    /**
     * Base config location (relative to working dir); may be overridden by system property
     * <pre>com.metaphacts.config.baselocation</pre> (see {@link #DEFAULT_CONFIG_BASE_LOCATION}).
     *
     * @return the config base path, including a trailing "/"
     */
    public static String getConfigBasePath() {
        String configBaseLocation = System.getProperty(SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE);
        if (configBaseLocation == null) {
            return DEFAULT_CONFIG_BASE_LOCATION;
        } else {
            return configBaseLocation.endsWith("/") ? configBaseLocation
                : configBaseLocation + "/";
        }
    }

    public static String getAppsDirectory() {
        String value = System.getProperty("appsDirectory");
        return StringUtils.isEmpty(value) ? (getRuntimeDirectory() + "/apps/") : value;
    }

    public static boolean arePluginBasedAppsMutable() {
        String value = System.getProperty("config.mutablePluginApps");
        return value != null && value.equals("true");
    }

    /**
     * @return the global configuration group
     */
    public GlobalConfiguration getGlobalConfig() {
        return globalConfig;
    }

    /**
     * @return the environment configuration group.
     */
    public EnvironmentConfiguration getEnvironmentConfig() {
        return environmentConfig;
    }

    /**
     * @return the UI configuration group
     */
    public UIConfiguration getUiConfig() {
        return uiConfig;
    }
    
    public DataQualityConfiguration getDataQualityConfig() {
        return dataQualityConfig;
    }

    /**
     * Registers the custom configuration group. Throws an
     * {@link IllegalArgumentException} if the configuration group ID is null or
     * empty. The group is only registered if there exists no configuration
     * group with the given ID.
     *
     * @param configurationGroup
     *            the group to register
     * @return true if the group was registered, false otherwise
     */
    final public boolean registerCustomConfigurationGroup(
            final ConfigurationGroup configurationGroup) {

        // make sure there's no configuration group with the given ID
        final String customGroupId = configurationGroup.getId();
        if (StringUtils.isEmpty(customGroupId)) {
            throw new IllegalArgumentException(
                    "Cannot register configuration group: ID must not be null or empty.");
        }

        if (registry.keySet().contains(customGroupId))
            return false; // group with the given ID already exists

        // no ID conflict detected -> register the group
        registry.put(configurationGroup.getId(), configurationGroup);
        return true;

    }

    /**
     * Returns a custom configuration group with the given ID, casting it to the
     * specified clazz. Returns null of the config group does not exist or the
     * cast fails (in the latter case, a WARNING will be logged out in
     * addition).
     *
     * This is the proper mechanism to access configuration groups that are
     * hooked in via plugins, see the sample plugin for example code.
     *
     * @param configGroupId
     *            ID of the configuration group
     * @param clazz
     *            expected clazz of the configuration group
     *
     * @return the configuration group with the given ID or null, if not defined
     */
    final public <T extends ConfigurationGroup> T getCustomConfigurationGroup(
            final String configGroupId, final Class<T> clazz) {
        try {
            return clazz.cast(registry.get(configGroupId));
        } catch (ClassCastException e) {
            logger.warn("Error casting to configuration group class: "
                    + e.getMessage());
        }

        return null; // fallback
    }

    /************************** REST CALL ENTRY POINTS ************************/

    /**
     * Lists all configuration groups, in alphabetically sorted order.
     *
     * @return all configuration groups, independently from whether the user has
     *         access rights to (any of) their items
     */
    public List<String> listGroups() {

        // convert to tree set first in order to have it sorted alphabetically
        return new ArrayList<String>(new TreeSet<String>(registry.keySet()));
    }

    /**
     * <p>
     * Returns a mapping from configuration parameters in the group to parameter
     * value information objects.
     * </p>
     *
     * <p>
     * <strong>Please note security checks need to done outside of this method
     * i.e. the map being returned contains all configuration parameters
     * regardless of whether the user has the respective permissions!</strong>
     * </p>
     *
     * @param configGroup config group for which the lookup is performed
     * @return a map from identifiers to configuration parameter value
     *         information objects
     */
    public Map<String, ConfigParameterValueInfo> listParamsInGroups(
            final String configGroup) throws UnknownConfigurationException {

        ConfigurationGroup group = registry.get(configGroup);
        if (group == null) {
            throw new UnknownConfigurationException();
        }

        return group.getAllParametersInfo();
    }

    /**
     * <p>
     * Tries to lookup the specified <strong>configIdInGroup</strong> in the
     * specified <strong>configGroup</strong>.
     * </p>
     *
     * <p>
     * <strong>Please note security checks need to done outside of this
     * method!</strong>
     * </p>
     *
     * @param configGroup
     * @param configIdInGroup
     * @return The configuration parameter value encapsulated in a
     *         {@link ConfigParameterValueInfo}
     * @throws UnknownConfigurationException
     *             If the config group or parameter in the group does not exit
     *             or there are any unexpected expections during the lookup.
     */
    public ConfigParameterValueInfo lookupProperty(final String configGroup,
            final String configIdInGroup) throws UnknownConfigurationException {

        // assert parameters are set correctly
        if (StringUtils.isEmpty(configGroup)
                || StringUtils.isEmpty(configIdInGroup)) {
            throw new UnknownConfigurationException();
        }

        ConfigurationGroup group = registry.get(configGroup);
        if (group == null) {
            throw new UnknownConfigurationException();
        }

        return group.getParameterInfo(configIdInGroup);
    }

    /**
     * Sets (writes) the <strong>configValue</strong> for the specified
     * <strong>configIdInGroup</strong> in the specified
     * <strong>configGroup</strong>.
     *
     * @throws UnknownConfigurationException
     *             If the config group or parameter in the group does not exit
     *             or there are any unexpected exceptions while writing the
     *             property.
     * @throws ConfigurationException 
     */
    public void setProperty(
        String configGroup,
        String configIdInGroup,
        List<String> configValues,
        String targetAppId
    ) throws UnknownConfigurationException, ConfigurationException {

        // assert parameters are set correctly
        if (StringUtils.isEmpty(configGroup)
                || StringUtils.isEmpty(configIdInGroup)) {
            throw new UnknownConfigurationException();
        }

        ConfigurationGroup group = registry.get(configGroup);
        if (group == null) {
            throw new UnknownConfigurationException("Configuration group: \""
                    + configGroup + "\" is unknown.");
        }

        // prevent writing if property is shadowed by runtime configuration
        String systemPropertyName =
            ConfigurationUtil.configParamToSystemParam(configGroup, configIdInGroup);
        String systemProperty = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemProperty)) { // shadowed by -Dconfig....
            throw new UnauthorizedException(
                    "Configuration element is shadowed by system parameter. "
                            + "Changing the parameter would have no effect and is forbidden.");
        }

        // This is just a workaround to prevent writing to environment config
        // -> we may want to protect the environment config via annotations at
        // some some point
        if (group instanceof EnvironmentConfiguration) {
            throw new UnauthorizedException(
                    "Not allowed to change environment configuration at runtime.");
        }

        // invoke method and return result
        try {
            if (group instanceof ConfigurationGroupBase) {
                ((ConfigurationGroupBase) group).setParameter(
                    configIdInGroup, configValues, targetAppId
                );
            } else {
                throw new UnknownConfigurationException();
            }
        } catch (Exception e) {
            if (e.getCause() instanceof ConfigurationException) {
            	throw (ConfigurationException) e.getCause();
            }
            // this should not happen, so write some log output
            logger.warn("Exception during setting values [" + configValues +
                "]\" for configuration property \"" + configIdInGroup + "\"", e);
            throw new UnknownConfigurationException();
        }
    }

    /************************ END REST CALL ENTRY POINTS ***********************/

    /**
     * Returns the parameter name identified by the getter method.
     */
    public static String getParamNameForGetter(Method method) {

        if (method == null) {
            return null;
        }

        final String name = method.getName();

        if (name.startsWith("get")) {

            final String paramName = name.substring(3);
            return Character.toLowerCase(paramName.charAt(0))
                    + paramName.substring(1);

        } else if (name.startsWith("is")) {

            final String paramName = name.substring(2);
            return Character.toLowerCase(paramName.charAt(0))
                    + paramName.substring(1);

        } else {
            logger.warn("Called getParamNameForGetter() for method not being a getter: "
                    + name);
            return null;
        }

    }

    /**
     * Note: we can's use the {@link PropertyDescriptor} here, since our classes
     * only have a setter. That's why we have custom logics to resolve getters.
     * We give priority to get over is prefixes (which is fine as long as
     * there's only one present).
     *
     * @return the getter name for a given
     */
    public static Method getGetterMethod(String paramName, Class<?> clazz) {

        if (StringUtils.isEmpty(paramName)) {
            return null;
        }

        final String capitalizedParamName = Character.toUpperCase(paramName
                .charAt(0)) + paramName.substring(1);

        // try "get" prefix
        Method getter = null;
        try {

            getter = clazz.getMethod("get" + capitalizedParamName);

        } catch (NoSuchMethodException e) {

            // ignore

        } catch (SecurityException e) {

            logger.warn("Security exception accessing getter for "
                    + capitalizedParamName + ": " + e.getMessage());

        }

        if (getter == null) { // fallback: try "is" prefix

            try {

                getter = clazz.getMethod("is" + capitalizedParamName);

            } catch (NoSuchMethodException e) {

                // ignore

            } catch (SecurityException e) {

                logger.warn("Security exception accessing getter for "
                        + capitalizedParamName + ": " + e.getMessage());

            }

        }

        if (getter == null) {
            return null; // not found
        }

        // finally check that the method has a non-void return type
        final Class<?> propertyType = getter.getReturnType();

        return propertyType == Void.TYPE ? null : getter;

    }

}
