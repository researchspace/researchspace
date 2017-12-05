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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.io.File;
import java.io.IOException;
import java.util.Collection;

import org.apache.commons.io.FileUtils;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;

import ro.fortsoft.pf4j.PluginException;

import com.google.common.collect.Lists;
import com.google.inject.Inject;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.plugin.handler.CopyConfigHandler;
import com.metaphacts.plugin.handler.CopyNamespaceHandler;
import com.metaphacts.plugin.handler.CopyTemplateHandler;
import com.metaphacts.plugin.handler.OverwriteConfigHandler;
import com.metaphacts.plugin.handler.OverwriteNamespaceHandler;
import com.metaphacts.plugin.handler.OverwriteTemplateHandler;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MetaphactoryPluginDescriptorFinderTest extends AbstractIntegrationTest{
    @Rule
    public TemporaryFolder tempFolderRule = new TemporaryFolder();
    
    @Rule
    public ExpectedException exception = ExpectedException.none();
    
    @Inject
    public MetaphactoryPluginManager manager;
    
    @Test
    public void testExceptionNoPluginId() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        File pluginProperties = new File(pulginDirectory, "plugin.properties");
        pluginProperties.createNewFile();
        
        MetaphactoryPluginDescriptorFinder finder = new  MetaphactoryPluginDescriptorFinder();
        exception.expect(PluginException.class);
        exception.expectMessage("id cannot be empty");
        manager.validatePluginDescriptor(finder.find(pulginDirectory.toPath()));
    }

    @Test
    public void testExceptionNoPluginVersion() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        Collection<String> lines = Lists.newArrayList(
                "plugin.id=testPlugin"
        );
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);
        
        MetaphactoryPluginDescriptorFinder finder = new  MetaphactoryPluginDescriptorFinder();
        exception.expect(PluginException.class);
        exception.expectMessage("version cannot be empty");
        manager.validatePluginDescriptor(finder.find(pulginDirectory.toPath()));
    }
    
    @Test
    public void testDefaults() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        Collection<String> lines = Lists.newArrayList(
                "plugin.id=testPlugin",
                "plugin.version=1.0.0"
                );
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);
        MetaphactoryPluginDescriptorFinder finder = new  MetaphactoryPluginDescriptorFinder();
        MetaphactoryPluginDescriptor descriptor = (MetaphactoryPluginDescriptor) finder.find(pulginDirectory.toPath());
        
        // if not plugin is class is defined, default MetaphactoryPlugin class should be returned
        assertEquals(MetaphactoryPlugin.class.getCanonicalName(), descriptor.getPluginClass());
        
        assertNull(descriptor.getConfigMergeStrategy());
        assertNull(descriptor.getTemplateMergeStrategy());
        assertNull(descriptor.getNamespaceMergeStrategy());
        
        assertEquals(CopyConfigHandler.class, descriptor.getConfigMergeHandler());
        assertEquals(CopyTemplateHandler.class, descriptor.getTemplateMergeHandler());
        assertEquals(CopyNamespaceHandler.class, descriptor.getNamespaceMergeHandler());
    }
    
    @Test
    public void testCopyStrategy() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        Collection<String> lines = Lists.newArrayList(
                "plugin.id=testPlugin",
                "plugin.version=1.0.0",
                "plugin.class=com.metaphacts.plugin.Test",
                "plugin.namespaceMergeStrategy=copy",
                "plugin.templateMergeStrategy=copy",
                "plugin.configMergeStrategy=copy"
        );
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);
        MetaphactoryPluginDescriptorFinder finder = new  MetaphactoryPluginDescriptorFinder();
        MetaphactoryPluginDescriptor descriptor = (MetaphactoryPluginDescriptor) finder.find(pulginDirectory.toPath());
        
        assertEquals("com.metaphacts.plugin.Test", descriptor.getPluginClass());
        
        assertEquals("copy",descriptor.getConfigMergeStrategy());
        assertEquals("copy",descriptor.getTemplateMergeStrategy());
        assertEquals("copy",descriptor.getNamespaceMergeStrategy());
        
        assertEquals(CopyConfigHandler.class, descriptor.getConfigMergeHandler());
        assertEquals(CopyTemplateHandler.class, descriptor.getTemplateMergeHandler());
        assertEquals(CopyNamespaceHandler.class, descriptor.getNamespaceMergeHandler());
    }

    @Test
    public void testOverrideStrategy() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        Collection<String> lines = Lists.newArrayList(
                "plugin.id=testPlugin",
                "plugin.version=1.0.0",
                "plugin.class=com.metaphacts.plugin.Test",
                "plugin.namespaceMergeStrategy=overwrite",
                "plugin.templateMergeStrategy=overwrite",
                "plugin.configMergeStrategy=overwrite"
                );
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);
        MetaphactoryPluginDescriptorFinder finder = new  MetaphactoryPluginDescriptorFinder();
        MetaphactoryPluginDescriptor descriptor = (MetaphactoryPluginDescriptor) finder.find(pulginDirectory.toPath());
        
        assertEquals("com.metaphacts.plugin.Test", descriptor.getPluginClass());
        
        assertEquals("overwrite",descriptor.getConfigMergeStrategy());
        assertEquals("overwrite",descriptor.getTemplateMergeStrategy());
        assertEquals("overwrite",descriptor.getNamespaceMergeStrategy());
        
        assertEquals(OverwriteConfigHandler.class, descriptor.getConfigMergeHandler());
        assertEquals(OverwriteTemplateHandler.class, descriptor.getTemplateMergeHandler());
        assertEquals(OverwriteNamespaceHandler.class, descriptor.getNamespaceMergeHandler());
    }
}