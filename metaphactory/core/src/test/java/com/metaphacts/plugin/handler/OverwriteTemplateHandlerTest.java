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

package com.metaphacts.plugin.handler;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.commons.io.FileUtils;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.junit.Test;

import com.google.common.collect.Lists;
import com.metaphacts.templates.AbstractFileTemplateStorage;
import com.metaphacts.templates.SimpleFileTemplateStorage;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class OverwriteTemplateHandlerTest extends InstallationHandlerTest {

    @Test
    public void testCopyAndOverwrite() throws IOException{
        final String foafPageIdentifier = AbstractFileTemplateStorage.normalize(FOAF.PAGE)+".html";
        final String foafPersonIdentifier = AbstractFileTemplateStorage.normalize(FOAF.PERSON)+".html";

        final File platformPageTemplateFile = new File(getPlatformTemplateFolder(), foafPageIdentifier);
        assertFalse(platformPageTemplateFile.exists());
        FileUtils.writeLines(platformPageTemplateFile, Lists.newArrayList("Platform Page Template"));
        assertTrue(platformPageTemplateFile.exists());

        final File platformPersonTemplateFile = new File(getPlatformTemplateFolder(), foafPersonIdentifier);
        assertFalse(platformPersonTemplateFile.exists());
        
        File appDir = createTestAppDir();

        final File pluginPageTemplateFile = new File(getPluginTemplateFolder(appDir), foafPageIdentifier);
        assertFalse(pluginPageTemplateFile.exists());
        FileUtils.writeLines(pluginPageTemplateFile, Lists.newArrayList("Plugin Page Template"));
        assertTrue(pluginPageTemplateFile.exists());

        final File pluginPersonTemplateFile = new File(getPluginTemplateFolder(appDir), foafPersonIdentifier);
        assertFalse(pluginPersonTemplateFile.exists());
        FileUtils.writeLines(pluginPersonTemplateFile, Lists.newArrayList("Plugin Person Template"));
        assertTrue(pluginPersonTemplateFile.exists());

        OverwriteTemplateHandler handler = new OverwriteTemplateHandler(config, appDir.toPath());
        handler.install();
        
        // this should still exist
        assertTrue(platformPageTemplateFile.exists());
        // but be overwritten i.e. the content is different
        assertEquals(
                Lists.<String>newArrayList("Plugin Page Template"), 
                FileUtils.readLines(platformPageTemplateFile, StandardCharsets.UTF_8)
        );

        // person file should now exist i.e. should have been copied
        assertTrue(pluginPersonTemplateFile.exists());
        assertEquals(
                Lists.<String>newArrayList("Plugin Person Template"), 
                FileUtils.readLines(pluginPersonTemplateFile, StandardCharsets.UTF_8)
        );

        assertThat(appender.getLogMessages(), hasItems(
                "Copied (by overwrite) file from \"" + pluginPageTemplateFile.getAbsolutePath() +"\" to \""+ getPlatformTemplateFolder() +"\".",
                "Copied file from \"" + pluginPersonTemplateFile.getAbsolutePath() +"\" to \""+ getPlatformTemplateFolder() +"\"."
                ));
    }
    @SuppressWarnings("unchecked")
    @Override
    protected List<Class<? extends PluginBaseInstallationHandler>> getClassesToLog() {
        return Lists.newArrayList(OverwriteTemplateHandler.class);
    }

    private File getPlatformTemplateFolder(){
        return new File(
                config.getRuntimeDirectory(),
                SimpleFileTemplateStorage.BASE_STORAGE_LOCATION
            );
    }

    private File getPluginTemplateFolder(File pluginDir){
        return new File(
                pluginDir,
                SimpleFileTemplateStorage.BASE_STORAGE_LOCATION
                );
    }

}