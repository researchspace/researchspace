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

import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.StringUtils;

import com.metaphacts.plugin.handler.ConfigBaseInstallationHandler;
import com.metaphacts.plugin.handler.CopyConfigHandler;
import com.metaphacts.plugin.handler.CopyNamespaceHandler;
import com.metaphacts.plugin.handler.CopyTemplateHandler;
import com.metaphacts.plugin.handler.OverwriteConfigHandler;
import com.metaphacts.plugin.handler.OverwriteNamespaceHandler;
import com.metaphacts.plugin.handler.NamespaceBaseInstallationHandler;
import com.metaphacts.plugin.handler.OverwriteTemplateHandler;
import com.metaphacts.plugin.handler.TemplateBaseInstallationHandler;

import ro.fortsoft.pf4j.PluginDescriptor;

/**
 * Custom metaphactory extension of the default {@link PluginDescriptor} to
 * support configuration and look-up of the {@link {
 * @link NamespaceMergeStrategy}, {@link TemplateMergeStrategy} and
 * {@link ConfigMergeStrategy} via plugin.properties.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MetaphactoryPluginDescriptor extends PluginDescriptor {
    enum NamespaceMergeStrategy {
        overwrite(OverwriteNamespaceHandler.class), copy(CopyNamespaceHandler.class);
            
        private final Class<? extends NamespaceBaseInstallationHandler> handler;
        
        private NamespaceMergeStrategy(Class<? extends NamespaceBaseInstallationHandler> clazz) {
            this.handler = clazz;
        }
        
        public  Class<? extends NamespaceBaseInstallationHandler> getHandler() {
            return handler;
        }
        
        public static boolean isValidEnum(String enumClass){
            return EnumUtils.isValidEnum(NamespaceMergeStrategy.class, enumClass);
        }
        
        public static String propertyName(){
            return "namespaceMergeStrategy";
        }
    }

    enum TemplateMergeStrategy {
        overwrite(OverwriteTemplateHandler.class), copy(CopyTemplateHandler.class);
        
        private final Class<? extends TemplateBaseInstallationHandler> handler;
        
        private TemplateMergeStrategy(Class<? extends TemplateBaseInstallationHandler> clazz) {
            this.handler = clazz;
        }
        
        public  Class<? extends TemplateBaseInstallationHandler> getHandler() {
            return handler;
        }
        
        public static boolean isValidEnum(String enumClass){
            return EnumUtils.isValidEnum(TemplateMergeStrategy.class, enumClass);
        }
        
        public static String propertyName(){
            return "templateMergeStrategy";
        }
    }
    
    enum ConfigMergeStrategy{
        overwrite(OverwriteConfigHandler.class), copy(CopyConfigHandler.class);
        
        private final Class<? extends ConfigBaseInstallationHandler> handler;
        
        private ConfigMergeStrategy(Class<? extends ConfigBaseInstallationHandler> clazz) {
            this.handler = clazz;
        }
        
        public  Class<? extends ConfigBaseInstallationHandler> getHandler() {
            return handler;
        }
        
        public static boolean isValidEnum(String enumClass){
            return EnumUtils.isValidEnum(ConfigMergeStrategy.class, enumClass);
        }
        
        public static String propertyName(){
            return "configMergeStrategy";
        }
    }
    
    private String namespaceMergeStrategy;
    private String templateMergeStrategy;
    private String configMergeStrategy;
    
    
    /**
     * Resolving the plugin.namespaceMergeStrategy property to the actual
     * implementation class i.e. any extension of
     * {@link NamespaceBaseInstallationHandler}.
     * 
     * @returnIf the property is null or empty this method returns the
     *           {@link CopyNamespaceHandler} by default.
     */
    public final Class<? extends NamespaceBaseInstallationHandler> getNamespaceMergeHandler(){
       if(NamespaceMergeStrategy.isValidEnum(getNamespaceMergeStrategy())){
           return NamespaceMergeStrategy.valueOf(getNamespaceMergeStrategy()).getHandler();
       }
       return NamespaceMergeStrategy.copy.getHandler();
    }

    /**
     * Resolving the plugin.templateMergeStrategy property to the actual
     * implementation class i.e. any extension of
     * {@link TemplateBaseInstallationHandler}.
     * 
     * @return If the property is null or empty this method returns the
     *         {@link CopyTemplateHandler} by default.
     */
    public final Class<? extends TemplateBaseInstallationHandler> getTemplateMergeHandler(){
        if(TemplateMergeStrategy.isValidEnum(getTemplateMergeStrategy())){
            return TemplateMergeStrategy.valueOf(getTemplateMergeStrategy()).getHandler();
        }
        return TemplateMergeStrategy.copy.getHandler();
    }

    /**
     * Resolving the plugin.configMergeStrategy property to the actual
     * implementation class i.e. any extension of
     * {@link ConfigBaseInstallationHandler}.
     * 
     * @return If the property is null or empty this method returns the
     *         {@link CopyConfigHandler} by default.
     */
    public final Class<? extends ConfigBaseInstallationHandler> getConfigMergeHandler(){
        if(ConfigMergeStrategy.isValidEnum(getConfigMergeStrategy())){
            return ConfigMergeStrategy.valueOf(getConfigMergeStrategy()).getHandler();
        }
        return ConfigMergeStrategy.copy.getHandler();
    }

    
    /**
     * Overrides the default behavior and returns
     * {@link com.metaphacts.plugin.MetaphactoryPlugin} class a default in case
     * this is not set in plugin.properties
     * 
     * @see ro.fortsoft.pf4j.PluginDescriptor#getPluginClass()
     */
    @Override
    public String getPluginClass() {
        return StringUtils.isEmpty(super.getPluginClass()) ? MetaphactoryPlugin.class.getCanonicalName() : super.getPluginClass();
    }

    String getNamespaceMergeStrategy() {
        return namespaceMergeStrategy;
    }
    
    void setNamespaceMergeStrategy(String namespaceMergeStrategy) {
        this.namespaceMergeStrategy = namespaceMergeStrategy;
    }
    String getTemplateMergeStrategy() {
        return templateMergeStrategy;
    }
    void setTemplateMergeStrategy(String templateMergeStrategy) {
        this.templateMergeStrategy = templateMergeStrategy;
    }
    
    String getConfigMergeStrategy() {
        return configMergeStrategy;
    }

    void setConfigMergeStrategy(String configMergeStrategy) {
        this.configMergeStrategy = configMergeStrategy;
    }

}