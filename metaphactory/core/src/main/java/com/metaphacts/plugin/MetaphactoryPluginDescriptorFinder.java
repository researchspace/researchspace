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

import java.util.Properties;

import ro.fortsoft.pf4j.PropertiesPluginDescriptorFinder;

import com.metaphacts.plugin.MetaphactoryPluginDescriptor.ConfigMergeStrategy;
import com.metaphacts.plugin.MetaphactoryPluginDescriptor.NamespaceMergeStrategy;
import com.metaphacts.plugin.MetaphactoryPluginDescriptor.TemplateMergeStrategy;

/**
 * <p>
 * Custom metaphactory extension of the default
 * {@link PropertiesPluginDescriptorFinder} to initialize
 * {@link MetaphactoryPluginDescriptor}.
 * <p>
 * 
 * This is to extend the plugin description with custom properties:
 * <ul>
 *  <li>plugin.templateMergeStrategy</li>
 *  <li>plugin.configMergeStrategy</li>
 *  <li>plugin.namespacesMergeStrategy</li>
 *</ul>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MetaphactoryPluginDescriptorFinder extends PropertiesPluginDescriptorFinder {
    @Override
    protected final MetaphactoryPluginDescriptor createPluginDescriptor(Properties properties) {
        MetaphactoryPluginDescriptor desc = (MetaphactoryPluginDescriptor) super.createPluginDescriptor(properties);
        
        String namespaceMergingStrategy = properties.getProperty("plugin."+NamespaceMergeStrategy.propertyName());
        desc.setNamespaceMergeStrategy(namespaceMergingStrategy);

        String templateMergingStrategy = properties.getProperty("plugin."+TemplateMergeStrategy.propertyName());
        desc.setTemplateMergeStrategy(templateMergingStrategy);

        String configMergingStrategy = properties.getProperty("plugin."+ConfigMergeStrategy.propertyName());
        desc.setConfigMergeStrategy(configMergingStrategy);
        return desc;
    }
    
    /*
     * This needs to be overwritten to return a MetaphactoryPluginDescriptor,
     * when called within the super.createPluginDescriptor(properties).
     * 
     * @see ro.fortsoft.pf4j.PropertiesPluginDescriptorFinder#
     * createPluginDescriptorInstance()
     */
    @Override
    protected final MetaphactoryPluginDescriptor createPluginDescriptorInstance() {
        return new MetaphactoryPluginDescriptor();
    }
    
}