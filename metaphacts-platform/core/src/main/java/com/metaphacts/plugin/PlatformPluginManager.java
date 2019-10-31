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

package com.metaphacts.plugin;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.TrueFileFilter;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.github.zafarkhaja.semver.Version;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.config.Configuration;
import com.metaphacts.plugin.extension.ConfigurationExtension;
import com.metaphacts.plugin.extension.RestExtension;
import com.metaphacts.sail.rest.sql.MpJDBCDriverManager;

import ro.fortsoft.pf4j.DefaultPluginManager;
import ro.fortsoft.pf4j.PluginDescriptor;
import ro.fortsoft.pf4j.PluginDescriptorFinder;
import ro.fortsoft.pf4j.PluginException;
import ro.fortsoft.pf4j.PluginRepository;
import ro.fortsoft.pf4j.PluginWrapper;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
public class PlatformPluginManager extends DefaultPluginManager {

    private static final Logger logger = LogManager
            .getLogger(PlatformPluginManager.class);

    @Inject
    public PlatformPluginManager() {
        super(Paths.get(Configuration.getAppsDirectory()));

        if (this.getPluginsRoot().toFile().exists()) {
            // regular bootstrap
            this.loadPlugins();
            logger.info("Loaded plugins: {}", this.plugins);
        } else {
            // notify user that the directory does not exist / no apps have been
            // loaded
            logger.warn(
                    "App directory {} does not exist. No apps will be initialized.",
                    this.getPluginsRoot());
        }
    }

    /**
     * Eager singleton class to start plugins after Configuration is loaded.
     */
    public static class Starter {
        @Inject
        public Starter(
            PlatformPluginManager pluginManager,
            Configuration config,
            MpJDBCDriverManager jdbcDriverManager
        ) {
            pluginManager.startPlugins(config, jdbcDriverManager);
        }
    }

    private void startPlugins(Configuration config, MpJDBCDriverManager jdbcDriverManager) {
        logger.info("Starting plugins...");

        // register config to plugins
        for (final PlatformPlugin mphPlugin : asPlatformPlugins(this.getPlugins())) {

            if (mphPlugin.getClass().equals(PlatformPlugin.class)) {
                logger.info("Using default {} as main class.",
                    PlatformPlugin.class.getName());
            } else {
                logger.info(
                    "Using custom platform plugin class extension {} as provided by the plugin.",
                    mphPlugin.getClass().getName());
            }

            // init before the plugin gets actually started
            mphPlugin.init(config, jdbcDriverManager);
        }

        this.startPlugins();

        for (PluginWrapper pluginWrapper : getStartedPlugins()) {
            if (pluginWrapper.getPlugin() instanceof PlatformPlugin) {
                logger.info("Initialized plugin \"{}\".", pluginWrapper.getPluginId());
            } else {
                this.disablePlugin(pluginWrapper.getPluginId());
                logger.error(
                    "Plugin class {} must be equal to or extend {}. "
                        + "Plugin has been disabled and will not be loaded.",
                    pluginWrapper.getPlugin().getClass().getName(),
                    PlatformPlugin.class.getName()
                );
            }
        }
        logger.info("Started plugins: {}", this.getStartedPlugins());

        // type check is done in the outer if
        for (PlatformPlugin mphPlugin : asPlatformPlugins(getStartedPlugins())) {
            for (Class<? extends ConfigurationExtension> group :
                getConfigGroupExtensions(mphPlugin.getWrapper().getPluginId())
            ) {
                mphPlugin.registerCustomConfigurationGroup(group);
            }
        }
    }

    public static List<PlatformPlugin> asPlatformPlugins(List<PluginWrapper> sourcePlugins) {
        List<PlatformPlugin> plugins = new ArrayList<>();
        for (final PluginWrapper pluginWrapper : sourcePlugins) {
            if (pluginWrapper.getPlugin() instanceof PlatformPlugin) {
                plugins.add((PlatformPlugin) pluginWrapper.getPlugin());
            }
        }
        return plugins;
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
        return new PlatformPluginDescriptorFinder();
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
    
    @Override
    protected PluginRepository createPluginRepository() {
        return new PlatformPluginRepository(getPluginsRoot(), isDevelopment());
    }
    
    @Override
    protected PluginWrapper loadPluginFromPath(Path pluginPath) throws PluginException {
        
        // First unzip any ZIP files
        try {
            pluginPath = PluginZipUtils.expandAndDeleteIfValidZipApp(pluginPath);
            checkAppStructureLogWarning(pluginPath.toFile());
        } catch (Exception e) {
            logger.error("Failed to unzip {} . Error: {} " ,pluginPath, e.getMessage() );
            logger.debug("Details: {}", e);
            return null;
        }
        return super.loadPluginFromPath(pluginPath);
    }
    
    private void checkAppStructureLogWarning(File appFolder) {
        // TODO expand checks to files in the future
        final ArrayList<String> supportedFolders = Lists.newArrayList("data", "data/templates",
                "plugin.properties", "assets", "ldp", "ldp/assets", "ldp/default", "config", "config/repositories",
                "config/services", "config/page-layout", "lib");
        for (File f : FileUtils.listFiles(appFolder, TrueFileFilter.INSTANCE,
                TrueFileFilter.INSTANCE)) {
            // relativize returns without leading /
            String relativePath = appFolder.toURI().relativize(f.toURI()).getPath();
            if (supportedFolders.contains(relativePath) || supportedFolders.stream().anyMatch(supported -> relativePath.startsWith(supported) )) {
               continue;
            }
            logger.warn(
                    "App \"{}\" contains a folder \"{}\"  which doesn't seem to be a supported app artefact or is packaged into the wrong directory structure.",
                    appFolder.getName(), relativePath);
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
    }
}
