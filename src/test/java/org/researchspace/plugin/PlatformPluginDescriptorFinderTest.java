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

package org.researchspace.plugin;

import static org.junit.Assert.assertEquals;

import java.io.File;
import java.io.IOException;
import java.util.Collection;

import org.apache.commons.io.FileUtils;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.plugin.PlatformPlugin;
import org.researchspace.plugin.PlatformPluginDescriptor;
import org.researchspace.plugin.PlatformPluginDescriptorFinder;
import org.researchspace.plugin.PlatformPluginManager;

import ro.fortsoft.pf4j.PluginException;

import com.google.common.collect.Lists;
import com.google.inject.Inject;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PlatformPluginDescriptorFinderTest extends AbstractIntegrationTest {
    @Rule
    public TemporaryFolder tempFolderRule = new TemporaryFolder();

    @Rule
    public ExpectedException exception = ExpectedException.none();

    @Inject
    public PlatformPluginManager manager;

    @Test
    public void testExceptionNoPluginId() throws IOException, PluginException {
        File pulginDirectory = tempFolderRule.newFolder();

        File pluginProperties = new File(pulginDirectory, "plugin.properties");
        pluginProperties.createNewFile();

        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
        exception.expect(PluginException.class);
        exception.expectMessage("id cannot be empty");
        manager.validatePluginDescriptor(finder.find(pulginDirectory.toPath()));
    }

    @Test
    public void testExceptionNoPluginVersion() throws IOException, PluginException {
        File pulginDirectory = tempFolderRule.newFolder();

        Collection<String> lines = Lists.newArrayList("plugin.id=testPlugin");
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);

        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
        exception.expect(PluginException.class);
        exception.expectMessage("version cannot be empty");
        manager.validatePluginDescriptor(finder.find(pulginDirectory.toPath()));
    }

    @Test
    public void testDefaults() throws IOException, PluginException {
        File pulginDirectory = tempFolderRule.newFolder();

        Collection<String> lines = Lists.newArrayList("plugin.id=testPlugin", "plugin.version=1.0.0");
        FileUtils.writeLines(new File(pulginDirectory, "plugin.properties"), lines);
        PlatformPluginDescriptorFinder finder = new PlatformPluginDescriptorFinder();
        PlatformPluginDescriptor descriptor = (PlatformPluginDescriptor) finder.find(pulginDirectory.toPath());

        // if not plugin is class is defined, default PlatformPlugin class should be
        // returned
        assertEquals(PlatformPlugin.class.getCanonicalName(), descriptor.getPluginClass());
    }
}
