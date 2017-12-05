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
import java.util.Collection;
import java.util.List;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.io.FileUtils;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.SKOS;
import org.junit.Test;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry.ProtectedNamespaceDeletionException;
import com.metaphacts.config.UnknownConfigurationException;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class CopyConfigHandlerTest extends InstallationHandlerTest { 
    @Test
    public void testCopyConfigNoneExisting() throws IOException, ProtectedNamespaceDeletionException, ConfigurationException{

        assertEquals(
                Lists.<String>newArrayList(), 
                FileUtils.readLines(config.getGlobalConfig().getConfigFile(), StandardCharsets.UTF_8)
                );
        assertEquals(
                Lists.<String>newArrayList(), 
                FileUtils.readLines(config.getUiConfig().getConfigFile(), StandardCharsets.UTF_8)
        );

        File appDir = createTestAppDir();

        FileUtils.writeLines(new File(appDir, "/config/ui.prop"), Lists.newArrayList("preferredLabels = skos:prefLabel"));
        FileUtils.writeLines(new File(appDir, "/config/global.prop"), Lists.newArrayList("homePage = StartTest123"));

        CopyConfigHandler handler = new CopyConfigHandler(config, appDir.toPath());
        handler.install();

        ns.get().set("skos", SKOS.NAMESPACE);
        assertEquals(
                Lists.<String> newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), 
                config.getUiConfig().getPreferredLabels()
        );
        assertThat(appender.getLogMessages(), hasItems(
                "Copied none-existing config property \"preferredLabels = skos:prefLabel\" to \"ui.prop\".",
                "Copied none-existing config property \"homePage = StartTest123\" to \"global.prop\"."
                ));
    }

    @Test
    public void testCopyConfigExisting() throws IOException, UnknownConfigurationException, ProtectedNamespaceDeletionException, ConfigurationException{
        config.setProperty(config.getGlobalConfig().getId(), "homePage", "Test12345");
        config.setProperty(config.getUiConfig().getId(), "preferredLabels", "skos:prefLabel");

        assertEquals(
                Lists.<String>newArrayList("homePage = Test12345"), 
                FileUtils.readLines(config.getGlobalConfig().getConfigFile(), StandardCharsets.UTF_8)
                );
        assertEquals(
                Lists.<String>newArrayList("preferredLabels = skos:prefLabel"), 
                FileUtils.readLines(config.getUiConfig().getConfigFile(), StandardCharsets.UTF_8)
                );

        File appDir = createTestAppDir();
        
        FileUtils.writeLines(new File(appDir, "/config/ui.prop"), Lists.newArrayList("preferredLabels = foaf:name"));
        FileUtils.writeLines(new File(appDir, "/config/global.prop"), Lists.newArrayList("homePage = Start"));
        
        CopyConfigHandler handler = new CopyConfigHandler(config, appDir.toPath());
        handler.install();

        ns.get().set("skos", SKOS.NAMESPACE);
        assertEquals(
                Lists.<String> newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), 
                config.getUiConfig().getPreferredLabels()
        );
        assertEquals("Test12345", config.getGlobalConfig().getHomePage());

        assertThat(appender.getLogMessages(), hasItems(
                "Config property \"preferredLabels\" already exists in platform \"ui.prop\". Skipping.",
                "Config property \"homePage\" already exists in platform \"global.prop\". Skipping."
                ));
    }
    
    @Test
    public void testCopyMixedInUiProp() throws IOException, UnknownConfigurationException, ProtectedNamespaceDeletionException, ConfigurationException{
        ns.get().set("skos", SKOS.NAMESPACE);
        ns.get().set("foaf", FOAF.NAMESPACE);

        // set preferredLabels to skos:prefLabel
        config.setProperty(config.getUiConfig().getId(), "preferredLabels", "skos:prefLabel");
        config.setProperty(config.getUiConfig().getId(), "preferredThumbnails", "foaf:thumbnail");
        assertEquals(
                Lists.<String> newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), 
                config.getUiConfig().getPreferredLabels()
        );
        assertEquals(
                Lists.<String>newArrayList("<" + FOAF.THUMBNAIL.stringValue() + ">"),
                config.getUiConfig().getPreferredThumbnails()
        );

        // assert that this value is persisted in the platform ui.prop
        assertEquals(
                Lists.<String>newArrayList("preferredLabels = skos:prefLabel", "preferredThumbnails = foaf:thumbnail") , 
                FileUtils.readLines(config.getUiConfig().getConfigFile(), StandardCharsets.UTF_8)
        );

        // write different preferredLabels property to ui.prop in plugin
        File appDir = createTestAppDir();
        Collection<String> lines = Lists.newArrayList(
                "preferredLabels = rdfs:label",
                "noExistingProp = false",
                "preferredLanguages = de",
                "preferredThumbnails = <http://xmlns.com/foaf/0.1/image>"
        );
        FileUtils.writeLines(new File(appDir, "/config/ui.prop"), lines);

        CopyConfigHandler handler = new CopyConfigHandler(config, appDir.toPath());
        handler.install();

        // assert that the existing value from ui.prop in plugin did not
        // overwrite the value in platform ui.prop and 
        assertEquals(
                Lists.<String> newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), 
                config.getUiConfig().getPreferredLabels()
        );
        assertEquals(Lists.<String>newArrayList("de"), config.getUiConfig().getPreferredLanguages());
        assertEquals(Lists.<String>newArrayList("<http://xmlns.com/foaf/0.1/thumbnail>"), config.getUiConfig().getPreferredThumbnails());
        assertEquals(
                Lists.<String>newArrayList("preferredLabels = skos:prefLabel", "preferredThumbnails = foaf:thumbnail", "preferredLanguages = de") , 
                FileUtils.readLines(config.getUiConfig().getConfigFile(), StandardCharsets.UTF_8)
        );
        assertThat(appender.getLogMessages(), hasItems(
                "Config property \"preferredLabels\" already exists in platform \"ui.prop\". Skipping.",
                "Error while setting a configuration property in \"ui.prop\": Config property \"noExistingProp\" is unkown to configuration group \"ui\".",
                "Copied none-existing config property \"preferredLanguages = de\" to \"ui.prop\".",
                "Config property \"preferredThumbnails\" already exists in platform \"ui.prop\". Skipping."
                ));
    }
    
    @Test
    public void copyingNoneExistingPropertyFiles() throws IOException{
        final File appDir = createTestAppDir();
        final File pluginConfigPropFile = new File(appDir, "/config/myAppConfig.prop");
        assertTrue(pluginConfigPropFile.createNewFile());

        FileUtils.writeLines(pluginConfigPropFile, Lists.newArrayList("testProperty = testValue"));

        final File plaformConfigDir = new File(Configuration.getConfigBasePath());
        final File plaformCustomConfigPropFile = new File(plaformConfigDir,"myAppConfig.prop");
        assertFalse(plaformCustomConfigPropFile.exists());

        CopyConfigHandler handler = new CopyConfigHandler(config, appDir.toPath());
        handler.install();

        assertTrue(plaformCustomConfigPropFile.exists());
        
        assertEquals(
                Lists.<String>newArrayList("testProperty = testValue") , 
                FileUtils.readLines(plaformCustomConfigPropFile, StandardCharsets.UTF_8)
        );

        assertThat(appender.getLogMessages(), hasItems(
                "Trying to copy none-existing property files from plugin to main platform config dir.",
                "Copied file from \""+ pluginConfigPropFile.getAbsolutePath() +"\" to \""+ plaformConfigDir.getAbsolutePath() +"\"."
                ));
    }

    @SuppressWarnings("unchecked")
    @Override
    protected List<Class<? extends PluginBaseInstallationHandler>> getClassesToLog() {
        return Lists.newArrayList(CopyConfigHandler.class,ConfigBaseInstallationHandler.class);
    }

}