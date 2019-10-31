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

import static org.junit.Assert.assertEquals;

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

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PlatformPluginDescriptorFinderTest extends AbstractIntegrationTest{
    @Rule
    public TemporaryFolder tempFolderRule = new TemporaryFolder();
    
    @Rule
    public ExpectedException exception = ExpectedException.none();
    
    @Inject
    public PlatformPluginManager manager;
    
    @Test
    public void testExceptionNoPluginId() throws IOException, PluginException{
        File pulginDirectory = tempFolderRule.newFolder();
        
        File pluginProperties = new File(pulginDirectory, "plugin.properties");
        pluginProperties.createNewFile();
        
        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
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
        
        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
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
        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
        PlatformPluginDescriptor descriptor = (PlatformPluginDescriptor) finder.find(pulginDirectory.toPath());
        
        // if not plugin is class is defined, default PlatformPlugin class should be returned
        assertEquals(PlatformPlugin.class.getCanonicalName(), descriptor.getPluginClass());
    }
}
