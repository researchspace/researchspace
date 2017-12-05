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

import java.beans.PropertyDescriptor;
import java.io.File;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import com.google.common.collect.Maps;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.UnauthorizedException;

import com.google.inject.Inject;
import com.google.inject.Injector;
import com.metaphacts.config.groups.ConfigurationGroup;
import com.metaphacts.config.groups.ConfigurationGroupBase;
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

    /*
     * The key of the system property to look-up the runtimeDirectory property
     */
    public static final String SYSTEM_PROPERTY_RUNTIME_DIRECTORY = "runtimeDirectory";
    
    /*
     * The key of the system property to look-up the config baselocation
     * property
     */
    public static final String SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE = "com.metaphacts.config.baselocation";

    /**
     * The runtime base directory
     */
    private final String runtimeDirectory;

    // TODO: should get rid of CONFIG_BASE_LOCATION at all -> it's only used
    // by namespace service and we should only look that up internally
    // from within the configuration groups
    /**
     * Default base location (relative to working dir), may be overridden by
     * system property com.metaphacts.config.baselocation. See method
     * {@link #getConfigBasePath()} for details/implementation.
     */
    private final static String CONFIG_BASE_LOCATION = "config/";

    private final GlobalConfiguration globalConfig;

    private final EnvironmentConfiguration environmentConfig;

    private final UIConfiguration uiConfig;

    /**
     * A registry of configuration groups administered by the config. The
     * registry is used for automatic lookup via the REST API.
     */
    private final Map<String, ConfigurationGroup> registry;

    /**
     * Constructor
     * 
     * @throws InvalidConfigurationException
     */
    @Inject
    public Configuration(Injector injector) throws InvalidConfigurationException {

        // initialize runtime directory
        final String runtimeDirectoryOverride = System
                .getProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_DIRECTORY);
        runtimeDirectory = StringUtils.isEmpty(runtimeDirectoryOverride) ? "./"
                : runtimeDirectoryOverride;

        globalConfig = new GlobalConfiguration();
        uiConfig = injector.getInstance(UIConfiguration.class);
        environmentConfig = new EnvironmentConfiguration(runtimeDirectory);

        registry = new HashMap<String, ConfigurationGroup>();
        registry.put(globalConfig.getId(), globalConfig);
        registry.put(uiConfig.getId(), uiConfig);
        registry.put(environmentConfig.getId(), environmentConfig);
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

    public File getRuntimeDirectory() {
        return new File(runtimeDirectory);
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
     * @param the
     *            config group for which the lookup is performed
     * @return a map from identifiers to configuration parameter value
     *         information objects
     */
    public Map<String, ConfigParameterValueInfo> listParamsInGroups(
            final String configGroup) throws UnknownConfigurationException {

        final ConfigurationGroup group = registry.get(configGroup);

        if (group == null) {
            throw new UnknownConfigurationException();
        }

        final Map<String, ConfigParameterValueInfo> params = Maps.newHashMap();

        final Method[] methods = group.getClass().getDeclaredMethods();
        for (final Method method : methods) {

            if (method.getAnnotationsByType(ConfigurationParameter.class).length > 0) {

                final String configIdInGroup = getParamNameForGetter(method);
                if (configIdInGroup != null) {
                    ConfigParameterValueInfo value = lookupProperty(
                            configGroup, configIdInGroup);
                    params.put(configIdInGroup, value);
                }
            }
        }

        return params;
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

        final ConfigurationGroup group = registry.get(configGroup);
        if (group == null) {
            throw new UnknownConfigurationException();
        }

        // get read method (using bean conventions)
        final Class<?> runtimeClass = group.getClass();
        final Method readMethod = getGetterMethod(configIdInGroup, runtimeClass);

        if (readMethod == null) {

            throw new UnknownConfigurationException(); // no getter found

        }

        // invoke method and return result
        try {

            final Object value = readMethod.invoke(group);

            // check whether the parameter is shadowed
            final String systemPropertyName = ConfigurationUtil
                    .configParamToSystemParam(configGroup, configIdInGroup);
            boolean isShadowed = StringUtils.isNotEmpty(System
                    .getProperty(systemPropertyName));

            // and return the information required
            return new ConfigParameterValueInfo(value, isShadowed);

        } catch (Exception e) {

            // this should not happen, so write some log output
            logger.warn("Exception during ID based config parameter lookup "
                    + "when invoking target method '" + readMethod.getName()
                    + "': " + e.getMessage());

            throw new UnknownConfigurationException();

        }
    }

    /**
     * Sets (writes) the <strong>configValue</strong> for the specified
     * <strong>configIdInGroup</strong> in the specified
     * <strong>configGroup</strong>.
     * 
     * @param configGroup
     * @param configIdInGroup
     * @param configValue
     * @throws UnknownConfigurationException
     *             If the config group or parameter in the group does not exit
     *             or there are any unexpected expections while writing the
     *             property.
     */
    public void setProperty(final String configGroup,
            final String configIdInGroup, final String configValue)
            throws UnknownConfigurationException {

        // assert parameters are set correctly
        if (StringUtils.isEmpty(configGroup)
                || StringUtils.isEmpty(configIdInGroup)) {
            throw new UnknownConfigurationException();
        }

        final ConfigurationGroup group = registry.get(configGroup);
        if (group == null) {
            throw new UnknownConfigurationException("Configuration group: \""
                    + configIdInGroup + "\" is unkown.");
        }
        
        // get read method (using bean conventions)
        final Class<?> runtimeClass = group.getClass();
        final Method readMethod = getGetterMethod(configIdInGroup, runtimeClass);

        if (readMethod == null) {// no getter found
            throw new UnknownConfigurationException("Config property \""
                    + configIdInGroup
                    + "\" is unkown to configuration group \"" + configGroup
                    + "\".");
        }

        // prevent writing if property is shadowed by runtime configuration
        final String systemPropertyName = ConfigurationUtil
                .configParamToSystemParam(configGroup, configIdInGroup);
        final String systemProperty = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemProperty)) { // shadowed by
                                                      // -Dconfig....
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

                ((ConfigurationGroupBase) group).setParameter(configIdInGroup,
                        configValue);

            } else {

                throw new UnknownConfigurationException();

            }

        } catch (Exception e) {

            // this should not happen, so write some log output
            logger.warn("Exception during setting value " + configValue
                    + " for configuration property " + configIdInGroup + "': "
                    + e.getMessage());

            throw new UnknownConfigurationException();

        }
    }

    /************************ END REST CALL ENTRY POINTS ***********************/

    /**
     * @return the config base path, including a trailing "/"
     */
    public static String getConfigBasePath() {

        final String configBaseLocation = System
                .getProperty(Configuration.SYSTEM_PROPERTY_RUNTIME_CONFIG_BASE);

        if (configBaseLocation == null) {
            return CONFIG_BASE_LOCATION;
        } else {
            return configBaseLocation.endsWith("/") ? configBaseLocation
                    : configBaseLocation + "/";
        }
    }

    /**
     * Returns the parameter name identified by the getter method.
     * 
     * @param paramName
     * @param clazz
     * @return
     */
    protected String getParamNameForGetter(final Method method) {

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
    protected Method getGetterMethod(final String paramName,
            final Class<?> clazz) {

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

    /**
     * Lightweight wrapper around the value of a configuration parameter. In
     * addition to the configuration parameter itself, it contains meta data
     * such as the information whether the value is shadowed in the
     * configuration.
     * 
     * The class overrides toString() to yield a string representation of the
     * parameter's value object.
     * 
     * @author msc
     */
    public static class ConfigParameterValueInfo {

        final private Object value;

        final private boolean isShadowed;

        public ConfigParameterValueInfo(final Object value,
                final boolean isShadowed) {
            this.value = value;
            this.isShadowed = isShadowed;
        }

        public Object getValue() {
            return value;
        }

        public boolean isShadowed() {
            return isShadowed;
        }

        @Override
        public String toString() {

            // TODO: proper deserialization
            if (value instanceof Collection) {
                return StringUtils.join((Collection<?>) value, ",");
            } else {
                return value.toString();
            }
        }

    }

}
