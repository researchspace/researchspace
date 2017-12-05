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

package com.metaphacts.plugin;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import ro.fortsoft.pf4j.DefaultPluginManager;
import ro.fortsoft.pf4j.PluginDescriptor;
import ro.fortsoft.pf4j.PluginDescriptorFinder;
import ro.fortsoft.pf4j.PluginException;
import ro.fortsoft.pf4j.PluginWrapper;
import ro.fortsoft.pf4j.util.StringUtils;

import com.github.zafarkhaja.semver.Version;
import com.google.common.collect.Sets;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.plugin.MetaphactoryPluginDescriptor.ConfigMergeStrategy;
import com.metaphacts.plugin.MetaphactoryPluginDescriptor.NamespaceMergeStrategy;
import com.metaphacts.plugin.MetaphactoryPluginDescriptor.TemplateMergeStrategy;
import com.metaphacts.plugin.extension.ConfigurationExtension;
import com.metaphacts.plugin.extension.RestExtension;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
public class MetaphactoryPluginManager extends DefaultPluginManager {

    private static final Logger logger = LogManager
            .getLogger(MetaphactoryPluginManager.class);

    @Inject
    public MetaphactoryPluginManager(final Configuration config,
            final NamespaceRegistry namespaceRegistry) throws PluginException {
        super(new File(config.getEnvironmentConfig().getAppsDirectory())
                .toPath());

        if (this.getPluginsRoot().toFile().exists()) {

            // regular bootstrap
            this.loadPlugins();
            logger.info("Loaded plugins: {}", this.plugins);

            // register config to plugins
            for (final MetaphactoryPlugin mphPlugin : getMetaphactoryPlugins()) {

                if (mphPlugin.getClass().equals(MetaphactoryPlugin.class)) {
                    logger.info("Using default {} as main class.",
                            MetaphactoryPlugin.class.getName());
                } else {
                    logger.info(
                            "Using custom metaphactory plugin class extension {} as provided by the plugin.",
                            mphPlugin.getClass().getName());
                }

                // init before the plugin gets actually started
                mphPlugin.init(config, namespaceRegistry);

            }
            this.startPlugins();
            logger.info("Started plugins: {}", this.getStartedPlugins());

            // type check is done in the outer if
            for (final MetaphactoryPlugin mphPlugin : getMetaphactoryPlugins()) {

                for (Class<? extends ConfigurationExtension> group : getConfigGroupExtensions(mphPlugin
                        .getWrapper().getPluginId())) {
                    mphPlugin.registerCustomConfigurationGroup(group);
                }
            }

        } else {

            // notify user that the directory does not exist / no apps have been
            // loaded
            logger.warn(
                    "App directory {} does not exist. No apps will be bootstrapped.",
                    this.getPluginsRoot());

        }
    }

    private Set<MetaphactoryPlugin> getMetaphactoryPlugins() {
        Set<MetaphactoryPlugin> set = Sets.newHashSet();
        for (final PluginWrapper pluginWrapper : this.getPlugins()) {
            logger.info("Trying to initalize plugin \"{}\".",
                    pluginWrapper.getPluginId());
            if (pluginWrapper.getPlugin() instanceof MetaphactoryPlugin) {
                set.add((MetaphactoryPlugin) pluginWrapper.getPlugin());
            } else {
                this.disablePlugin(pluginWrapper.getPluginId());
                logger.error(
                        "Plugin class{} must be equal to or extend com.metaphacts.MetaphactoryPlugin. "
                                + "Plugin has been disabled and will not be loaded.",
                        pluginWrapper.getPlugin().getClass().getName());

            }
        }
        return set;
    }

    public Set<Class<?>> getRestExtensions() {
        HashSet<Class<?>> set = Sets.newHashSet();
        for (RestExtension e : getExtensions(RestExtension.class)) {
            set.add(e.getClass());
        }
        logger.info("Detected the following REST Extensions: " + set);
        return set;
    }

    public Set<Class<? extends ConfigurationExtension>> getConfigGroupExtensions(
            String pluginId) {
        HashSet<Class<? extends ConfigurationExtension>> set = Sets
                .newHashSet();
        for (ConfigurationExtension e : getExtensions(
                ConfigurationExtension.class, pluginId)) {
            set.add(e.getClass());
        }
        logger.info("Detected the following ConfigurationGroup Extensions: "
                + set);
        return set;
    }

    @Override
    protected PluginDescriptorFinder createPluginDescriptorFinder() {
        return new MetaphactoryPluginDescriptorFinder();
    }

    @Override
    public void loadPlugins() {
        try {
            super.loadPlugins();
        } catch (Exception e) {
            logger.error("Failed to load Plugins: ", e.getMessage());
            logger.debug("Details:", e);
        }
    }

    /*
     * pf4j's default implementation reads package implementation version and
     * requires valid semantic version. However, in particular for development
     * builds we do not use valid sem version format.
     * 
     * (non-Javadoc)
     * 
     * @see ro.fortsoft.pf4j.DefaultPluginManager#getVersion()
     */
    @Override
    public Version getVersion() {
        Version version;
        try {
            version = super.getVersion();
        } catch (Exception e) {
            logger.error("Current implementation version is not valid sem version format. Using 0.0.0 fallback.");
            version = Version.forIntegers(0, 0, 0);
        }
        return version;
    }
    
    @Override
    protected final void validatePluginDescriptor(PluginDescriptor pluginDescriptor) throws PluginException {
        super.validatePluginDescriptor(pluginDescriptor);
        
        MetaphactoryPluginDescriptor descriptor = (MetaphactoryPluginDescriptor)pluginDescriptor;
        if (!StringUtils.isEmpty(descriptor.getNamespaceMergeStrategy()) && !NamespaceMergeStrategy.isValidEnum(descriptor.getNamespaceMergeStrategy())){
            throw new PluginException(NamespaceMergeStrategy.propertyName() + " must be any of "+ Arrays.toString(NamespaceMergeStrategy.values()));
        }

        if (!StringUtils.isEmpty(descriptor.getTemplateMergeStrategy()) && !TemplateMergeStrategy.isValidEnum(descriptor.getTemplateMergeStrategy())){
            throw new PluginException(TemplateMergeStrategy.propertyName() + " must be any of "+ Arrays.toString(TemplateMergeStrategy.values()));
        }
        
        if (!StringUtils.isEmpty(descriptor.getConfigMergeStrategy()) && !ConfigMergeStrategy.isValidEnum(descriptor.getConfigMergeStrategy())){
            throw new PluginException(ConfigMergeStrategy.propertyName() + " must be any of "+ Arrays.toString(NamespaceMergeStrategy.values()));
        }
    }

}