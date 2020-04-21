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

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.annotation.Nullable;
import javax.inject.Inject;

import org.apache.commons.configuration2.CombinedConfiguration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.ConfigParameterValueInfo;
import org.researchspace.config.Configuration;
import org.researchspace.config.ConfigurationParameter;
import org.researchspace.config.ConfigurationParameterHook;
import org.researchspace.config.ConfigurationUtil;
import org.researchspace.config.InvalidConfigurationException;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ClassInfo;
import io.github.classgraph.ScanResult;

/**
 * Base class providing common functionality for the {@link ConfigurationGroup}
 * interface. This includes locating the file (based on the backing file type,
 * but prospectively also other metadata such as a list of lookup directories),
 * loading it into a backing apache commons configuration object, and providing
 * generic lookup (and, prospectively, serialization) capabilities.
 * 
 * The way this works is that the {@link ConfigurationGroupBase} objects
 * contains a {@link FileBasedConfigurationBuilder} as a backing object, to
 * which it delegates.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public abstract class ConfigurationGroupBase implements ConfigurationGroup {

    private static final Logger logger = LogManager.getLogger(ConfigurationGroupBase.class);

    /**
     * ID of the configuration group
     */
    private final String id;

    /**
     * Description of the configuration group
     */
    private final String description;

    protected final PlatformStorage platformStorage;

    @Inject
    protected CacheManager cacheManager;

    /**
     * The internal configuration
     */
    private CombinedConfiguration config;

    public ConfigurationGroupBase(String id, String description, PlatformStorage platformStorage)
            throws InvalidConfigurationException {
        this.id = id;
        this.description = description;
        this.platformStorage = platformStorage;

        ////// basic consistency checking
        if (StringUtils.isEmpty(id)) {
            throw new InvalidConfigurationException("Configuration group ID must not be null or empty.");
        }

        if (StringUtils.isEmpty(description)) {
            throw new InvalidConfigurationException("Configuration group description must not be null or empty.");
        }

        // initialize the backing configuration object (and so the configuration group
        // itself)
        logger.info("Loading configuration group {}", id);
        reloadConfig();

        // soundness and completeness check
        assertConsistency();
    }

    private StoragePath getObjectId() {
        return ObjectKind.CONFIG.resolve(id).addExtension(".prop");
    }

    private void reloadConfig() throws InvalidConfigurationException {
        try {
            config = ConfigurationUtil.readConfigFromStorageOverrides(platformStorage, getObjectId());
        } catch (IOException | ConfigurationException e) {
            throw new InvalidConfigurationException(e);
        }
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getDescription() {
        return description;
    }

    /**
     * Method to be overridden in order to assert that the configuration parameters
     * are consistent. This may include checks such as value space restrictions for
     * datatypes, interdependencies between parameters, etc.
     */
    @Override
    public abstract void assertConsistency();

    /**
     * Sets the property to the new value in the runtime and serializes the new
     * property value to the backing file.
     * 
     * @param parameterName the configuration parameter name relative to the group
     * @param configValues  values of the configuration
     * @param targetAppId   target app ID to save configuration parameter to
     * @throws ConfigurationException
     */
    public void setParameter(String parameterName, List<String> configValues, String targetAppId)
            throws UnknownConfigurationException {
        try {
            // the call below also checks if configuration parameter with specified name
            // exists
            ConfigurationParameterType type = getParameterType(parameterName);
            if (configValues.size() > 1 && type != ConfigurationParameterType.STRING_LIST) {
                throw new IllegalArgumentException("Cannot set multiple values for non-list configuration parameter");
            }
            internalSetParameter(parameterName, configValues, targetAppId);
        } catch (ConfigurationException e) {
            logger.warn("Error while saving configuration: " + e.getMessage());
            throw new RuntimeException(e);
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

    @Override
    public List<String> getStringList(final String configIdInGroup, final List<String> fallbackValue) {
        return getStringListFromDelegate(configIdInGroup, fallbackValue);
    }

    /**
     * Internal save method of the configuration group base. Serializes the saved
     * value back to the backing file.
     * 
     * @throws ConfigurationException
     * @throws NoSuchMethodException
     * @throws Exception
     */
    private synchronized void internalSetParameter(String configIdInGroup, List<String> configValues,
            String targetAppId) throws ConfigurationException {

        ObjectStorage storage = platformStorage.getStorage(targetAppId);

        try {
            logger.info("Saving new values: {} [at {}] -> {}", configIdInGroup, targetAppId, configValues);
            PropertiesConfiguration targetConfig = (PropertiesConfiguration) config.getConfiguration(targetAppId);
            if (targetConfig == null) {
                targetConfig = ConfigurationUtil.createEmptyConfig();
            }

            Object configValue = ConfigurationUtil.listAsConfigValue(configValues);
            if (configValue == null) {
                targetConfig.clearProperty(configIdInGroup);
            } else {
                checkParameterValueByUpdateHook(configIdInGroup, configValues, targetConfig);
                targetConfig.setProperty(configIdInGroup, configValue);
            }

            // in principal we could also move setProperty to the hooks itself in the future
            // and invalidate only specific caches
            cacheManager.invalidateAll();

            try (ByteArrayOutputStream content = new ByteArrayOutputStream()) {
                FileHandler handler = new FileHandler(targetConfig);
                handler.save(content);
                storage.appendObject(getObjectId(), platformStorage.getDefaultMetadata(), content.toInputStream(),
                        content.size());
            } catch (IOException e) {
                throw new ConfigurationException(e);
            }

            reloadConfig();
        } catch (InvalidConfigurationException e) {
            throw new ConfigurationException(e);
        }
    }

    private void checkParameterValueByUpdateHook(String configIdInGroup, List<String> configValues,
            PropertiesConfiguration targetConfig) throws ConfigurationException {
        Method updateHook = findParameterUpdateHook(configIdInGroup);
        if (updateHook != null) {
            try {
                updateHook.invoke(this, configIdInGroup, configValues, targetConfig);
            } catch (IllegalAccessException e) {
                throw new RuntimeException(e);
            } catch (InvocationTargetException e) {
                if (e.getCause() instanceof ConfigurationException) {
                    throw (ConfigurationException) e.getCause();
                }
                throw new RuntimeException(e);
            }
        }
    }

    @Nullable
    private Method findParameterUpdateHook(String configIdInGroup) {
        ClassGraph updateHookGraph = new ClassGraph().enableClassInfo().enableAnnotationInfo().enableMethodInfo()
                .enableStaticFinalFieldConstantInitializerValues().whitelistPackages("org.researchspace.config.groups");

        try (ScanResult scanResult = updateHookGraph.scan()) {
            for (ClassInfo routeClassInfo : scanResult
                    .getClassesWithMethodAnnotation(ConfigurationParameterHook.class.getName())) {
                Class<?> classWithConfigurationHook = routeClassInfo.loadClass();
                for (Method method : classWithConfigurationHook.getDeclaredMethods()) {
                    if (method.isAnnotationPresent(ConfigurationParameterHook.class)) {
                        if (method.getName().equals("onUpdate" + StringUtils.capitalize(configIdInGroup))) {
                            return method;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Returns the string associated with the given property ID. Internal helper
     * method, not exposed to the outside. All access to system parameters should go
     * through this and sibling getTYPEInternal, as this method handles overrides
     * via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current value string
     */
    private synchronized String getStringFromDelegate(String configIdInGroup, String fallbackValue) {
        String systemPropertyName = configParamToSystemParam(configIdInGroup);
        String systemPropertyVal = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            return systemPropertyVal;
        }
        return config.getString(configIdInGroup, fallbackValue);
    }

    private synchronized Boolean getBooleanFromDelegate(String configIdInGroup, Boolean fallbackValue) {
        String systemPropertyName = configParamToSystemParam(configIdInGroup);
        String systemPropertyVal = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            return Boolean.valueOf(systemPropertyVal);
        }
        // no or invalid system override for parameter resumes here:
        return config.getBoolean(configIdInGroup, fallbackValue);
    }

    /**
     * Returns the Integer associated with the given property ID. Internal helper
     * method, not exposed to the outside. All access to system parameters should go
     * through this and sibling getTYPEInternal, as this method handles overrides
     * via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current integer value
     */
    private synchronized Integer getIntegerFromDelegate(String configIdInGroup, Integer fallbackValue) {
        String systemPropertyName = configParamToSystemParam(configIdInGroup);
        String systemPropertyVal = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            try {
                return Integer.valueOf(systemPropertyVal);
            } catch (NumberFormatException e) {
                logger.warn("-D parameter override for parameter " + configIdInGroup
                        + " provided, but not a valid integer: " + systemPropertyName
                        + ". Parameter override will be ignored.");
            }
        }
        // no or invalid system override for parameter resumes here:
        return config.getInteger(configIdInGroup, fallbackValue);
    }

    /**
     * Returns the string list associated with the given property ID. Internal
     * helper method, not exposed to the outside. All access to system parameters
     * should go through this and sibling getTYPEInternal, as this method handles
     * overrides via -D.config.<GroupId>.<ParamId>
     * 
     * @param configIdInGroup the parameter name relative to the group
     * @return the parameter's current value string list
     */
    public synchronized List<String> getStringListFromDelegate(String configIdInGroup, List<String> fallbackValue) {
        String systemPropertyName = configParamToSystemParam(configIdInGroup);
        String systemPropertyVal = System.getProperty(systemPropertyName);

        if (StringUtils.isNotEmpty(systemPropertyVal)) {
            return ConfigurationUtil.configValueAsList(systemPropertyVal);
        }

        String[] retAsArr = config.getStringArray(configIdInGroup);
        return retAsArr.length == 0 && fallbackValue != null ? fallbackValue : Arrays.asList(retAsArr);
    }

    /**
     * Converts a config parameter for the given group to its unique system
     * parameter name. More precisely, a config parameter <PARAM> in group <GROUP>
     * is referenced via config.<GROUP>.<PARAM>. Throws an
     * {@link IllegalArgumentException} if the config parameter passed in is null or
     * empty.
     * 
     * @param configParam
     * 
     * @return the associated system parameter string
     */
    private String configParamToSystemParam(final String configParam) {
        return ConfigurationUtil.configParamToSystemParam(getId(), configParam);
    }

    @Override
    public ConfigurationParameterType getParameterType(String paramName) throws UnknownConfigurationException {
        // get read method (using bean conventions)
        Method readMethod = Configuration.getGetterMethod(paramName, getClass());
        if (readMethod == null) {
            throw new UnknownConfigurationException("Config property \"" + paramName
                    + "\" is unknown to configuration group \"" + this.getId() + "\".");
        }

        Class<?> returnType = readMethod.getReturnType();
        if (returnType.isAssignableFrom(String.class)) {
            return ConfigurationParameterType.STRING;
        } else if (returnType.isAssignableFrom(Boolean.class) || returnType.isAssignableFrom(Boolean.TYPE)) {
            return ConfigurationParameterType.BOOLEAN;
        } else if (returnType.isAssignableFrom(Integer.class) || returnType.isAssignableFrom(Integer.TYPE)) {
            return ConfigurationParameterType.INTEGER;
        } else if (returnType.isAssignableFrom(List.class)) {
            return ConfigurationParameterType.STRING_LIST;
        } else {
            // fallback parameter type
            return ConfigurationParameterType.STRING;
        }
    }

    @Override
    public synchronized ConfigParameterValueInfo getParameterInfo(String parameterId)
            throws UnknownConfigurationException {
        // get read method (using bean conventions)
        Method readMethod = Configuration.getGetterMethod(parameterId, getClass());
        if (readMethod == null) {
            throw new UnknownConfigurationException("Config property \"" + parameterId
                    + "\" is unknown to configuration group \"" + this.getId() + "\".");
        }

        try {
            // invoke method and return result
            Object value = readMethod.invoke(this);

            ConfigurationParameterType type = getParameterType(parameterId);

            // check whether the parameter is shadowed
            String systemPropertyName = ConfigurationUtil.configParamToSystemParam(getId(), parameterId);
            boolean isShadowed = StringUtils.isNotEmpty(System.getProperty(systemPropertyName));

            List<String> definedByApps = ConfigurationUtil.getStorageIdsInOverrideOrderForParam(config, parameterId);

            // and return the information required
            return new ConfigParameterValueInfo(type, value, isShadowed, definedByApps);
        } catch (IllegalAccessException | InvocationTargetException e) {
            // this should not happen, so write some log output
            logger.warn("Exception during ID based config parameter lookup " + "when invoking target method '"
                    + readMethod.getName() + "': " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @Override
    public synchronized Map<String, ConfigParameterValueInfo> getAllParametersInfo()
            throws UnknownConfigurationException {
        Map<String, ConfigParameterValueInfo> params = new HashMap<>();

        Method[] methods = getClass().getDeclaredMethods();
        for (Method method : methods) {
            if (method.getAnnotationsByType(ConfigurationParameter.class).length == 0) {
                continue;
            }
            String parameterId = Configuration.getParamNameForGetter(method);
            if (parameterId != null) {
                ConfigParameterValueInfo value = getParameterInfo(parameterId);
                params.put(parameterId, value);
            }
        }

        return params;
    }
}
