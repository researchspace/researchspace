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

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Path;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import ro.fortsoft.pf4j.PluginException;
import ro.fortsoft.pf4j.PluginWrapper;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.groups.ConfigurationGroup;
import com.metaphacts.plugin.extension.ConfigurationExtension;
import com.metaphacts.plugin.extension.RestExtension;
import com.metaphacts.plugin.handler.ConfigBaseInstallationHandler;
import com.metaphacts.plugin.handler.NamespaceBaseInstallationHandler;
import com.metaphacts.plugin.handler.TemplateBaseInstallationHandler;

/**
 * <p>
 * This class will be instantiated by all plugins and
 * serve as the common class between a plugin (aka app) and the metaphactory
 * platform.
 * </p>
 * <strong> Please note: </strong>
 * <p>
 * In most cases it should not be required to extend this class i.e.
 * it should be sufficient to implement or extend the extension points. In
 * particular, {@link RestExtension} and {@link ConfigurationExtension}.
 * </p>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MetaphactoryPlugin extends ro.fortsoft.pf4j.Plugin {

    private static final Logger logger = LogManager.getLogger(MetaphactoryPlugin.class);

    // set via init() via external call
    private Configuration config;
    
    // set via init() via external call
    private NamespaceRegistry namespaceRegistry;
    
    public MetaphactoryPlugin(final PluginWrapper wrapper) {
        super(wrapper);
    }

    
    /**
     * Initializes the plugin with relevant information (such as configuration).
     * Is called once internally *prior* to start being executed.
     * 
     * @param config
     * @param namespaceRegistry
     */
    public void init(final Configuration config, final NamespaceRegistry namespaceRegistry) {
        this.config = config;
        this.namespaceRegistry = namespaceRegistry;
    }
    

    /**
     * Adds a custom configuration group. The configuration group must be registered
     * *prior* to the start() call of the method. It will then be automatically
     * registered to the platform configuration, where it can be looked up using
     * {@link Configuration#getCustomConfigurationGroup(String)} using the ID as parameter.
     * 
     * @param configGroup
     */
    public void registerCustomConfigurationGroup(final Class<? extends ConfigurationGroup> configGroupClass) {
        // instantiate the class
        try {
            final ConfigurationGroup configurationGroup = configGroupClass.newInstance();

            final boolean success = config.registerCustomConfigurationGroup(configurationGroup);
            if (success) {
                logger.info("Registered configuration group " + configurationGroup.getId());
            } else {
                logger.warn("Registration of configuration group " + configurationGroup.getId() + " failed."
                    + "This is probably due to an ID clash, make sure you use a unique ID for your config group. ");
            }
 
        } catch (Exception e) {
            
            logger.warn("Error instantiating configuration group from class " 
                + configGroupClass.getName() + ". Config class will not be available. "
                + "One problem might be that the configuration file is not included in the plugin."
                + "Please make sure that the configuration file is present.");
            
        }
    }
    
    
    /**
     * Start method is called by the application when the plugin is loaded.
     * @see ro.fortsoft.pf4j.Plugin#start()
     */
    @Override
    public final void start() throws PluginException {
        
        // install/bootstrap the artifacts from the plugin
        handleNamespaceInstallation();
        handleTemplateInstallation();
        handleConfigInstallation();
        
        // and delegate to super start() method
        super.start();
    }
    
    
    private void handleNamespaceInstallation() throws PluginException{
        Class<? extends NamespaceBaseInstallationHandler> namespaceHandlerClazz = getPluginDescriptor().getNamespaceMergeHandler();
        Constructor<?> ctor;
        NamespaceBaseInstallationHandler namespaceHandler = null;
        try {
            ctor = namespaceHandlerClazz.getDeclaredConstructor(Configuration.class, NamespaceRegistry.class, Path.class);
            namespaceHandler = (NamespaceBaseInstallationHandler) ctor.newInstance(new Object[] { config, namespaceRegistry, wrapper.getPluginPath() });
        } catch (NoSuchMethodException | SecurityException | InstantiationException | IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
            throw new PluginException("Failed to instantiate namespace handler " +namespaceHandlerClazz, e);
        }
        logger.info("Using {} namespace handler for merging namespaces from plugin to platform", getPluginDescriptor().getPluginId(), namespaceHandlerClazz.getName());
        namespaceHandler.install();
    }

    private void handleTemplateInstallation() throws PluginException{
        Class<? extends TemplateBaseInstallationHandler> templateHandlerClazz = getPluginDescriptor().getTemplateMergeHandler();
        Constructor<?> ctor;
        TemplateBaseInstallationHandler templateHandler = null;
        try {
            ctor = templateHandlerClazz.getDeclaredConstructor(Configuration.class, Path.class);
            templateHandler = (TemplateBaseInstallationHandler) ctor.newInstance(new Object[] { config, wrapper.getPluginPath()});
        } catch (NoSuchMethodException | SecurityException | InstantiationException | IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
            throw new PluginException("Failed to instantiate template handler " +templateHandlerClazz, e);
        }
        logger.info("Using {} template handler for merging templates from plugin to platform", getPluginDescriptor().getPluginId(), templateHandlerClazz.getName());
        templateHandler.install();
    }

    private void handleConfigInstallation() throws PluginException{
        Class<? extends ConfigBaseInstallationHandler> templateHandlerClazz = getPluginDescriptor().getConfigMergeHandler();
        Constructor<?> ctor;
        ConfigBaseInstallationHandler configHandler = null;
        try {
            ctor = templateHandlerClazz.getDeclaredConstructor(Configuration.class, Path.class);
            configHandler = (ConfigBaseInstallationHandler) ctor.newInstance(new Object[] { config, wrapper.getPluginPath() });
        } catch (NoSuchMethodException | SecurityException | InstantiationException | IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
            throw new PluginException("Failed to instantiate config handler " +templateHandlerClazz, e);
        }
        logger.info("Using {} config handler for merging config files from plugin to platform", getPluginDescriptor().getPluginId(), templateHandlerClazz.getName());
        configHandler.install();
    }
    
    /**
     * Util to cast the descriptor to {@link MetaphactoryPluginDescriptor}
     * @return
     */
    private MetaphactoryPluginDescriptor getPluginDescriptor(){
        return (MetaphactoryPluginDescriptor) getWrapper().getDescriptor();
    }
}