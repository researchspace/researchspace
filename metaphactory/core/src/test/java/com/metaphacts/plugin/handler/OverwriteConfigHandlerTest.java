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
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.io.FileUtils;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
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
public class OverwriteConfigHandlerTest extends InstallationHandlerTest {

    @Test
    public void testMixedInUiProp() throws UnknownConfigurationException, IOException, ProtectedNamespaceDeletionException, ConfigurationException{
        assertNotEquals(Lists.<String>newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), config.getUiConfig().getPreferredLabels());
        config.setProperty(config.getUiConfig().getId(), "preferredLabels", "<" + SKOS.PREF_LABEL.stringValue() + ">");
        assertEquals(Lists.<String>newArrayList("<" + SKOS.PREF_LABEL.stringValue() + ">"), config.getUiConfig().getPreferredLabels());
        assertEquals(Lists.<String>newArrayList("en"), config.getUiConfig().getPreferredLanguages());
        
        File appDir = createTestAppDir();
        Collection<String> lines = Lists.newArrayList(
                "preferredLabels = rdfs:label",
                "noExistingProp = false",
                "preferredLanguages = de"
        );
        FileUtils.writeLines(new File(appDir, "/config/ui.prop"), lines);
        
        OverwriteConfigHandler handler = new OverwriteConfigHandler(config, appDir.toPath());
        handler.install();
        
        // assert that the existing value from ui.prop in plugin and overrides
        // the value in platform ui.prop and
        ns.get().set("rdfs", RDFS.NAMESPACE);
        assertEquals(Lists.<String>newArrayList("<" + RDFS.LABEL.stringValue() + ">"), config.getUiConfig().getPreferredLabels());
        assertEquals(Lists.<String>newArrayList("de"), config.getUiConfig().getPreferredLanguages());
        assertEquals(
                Lists.<String>newArrayList("preferredLabels = rdfs:label", "preferredLanguages = de") , 
                FileUtils.readLines(config.getUiConfig().getConfigFile(), StandardCharsets.UTF_8)
        );
        assertThat(appender.getLogMessages(), hasItems(
                "Did overwrite config property \"preferredLabels = rdfs:label\" in \"ui.prop\".",
                "Error while setting a configuration property in \"ui.prop\": Config property \"noExistingProp\" is unkown to configuration group \"ui\".",
                "Copied none-existing config property \"preferredLanguages = de\" to \"ui.prop\"."
                ));
        
    }
    
    @Test
    public void testOverwriteInGlobalProp() throws UnknownConfigurationException, IOException{
        assertEquals("Help:Start", config.getGlobalConfig().getHomePage());
        config.setProperty(config.getGlobalConfig().getId(), "homePage", "TestStart");
        assertEquals("TestStart", config.getGlobalConfig().getHomePage());
        assertEquals(
                Lists.<String>newArrayList("homePage = TestStart") , 
                FileUtils.readLines(config.getGlobalConfig().getConfigFile(), StandardCharsets.UTF_8)
        );
        
        File appDir = createTestAppDir();
        Collection<String> lines = Lists.newArrayList(
                "homePage = TestStart123"
        );
        FileUtils.writeLines(new File(appDir, "/config/global.prop"), lines);
        
        OverwriteConfigHandler handler = new OverwriteConfigHandler(config, appDir.toPath());
        handler.install();
        
        assertEquals("TestStart123", config.getGlobalConfig().getHomePage());
        assertThat(appender.getLogMessages(), hasItems(
                "Did overwrite config property \"homePage = TestStart123\" in \"global.prop\"."
                ));
    }

    @Test
    public void testCopiedInGlobalAndUiProp() throws UnknownConfigurationException, IOException, ProtectedNamespaceDeletionException, ConfigurationException{
        ns.get().set("skos", SKOS.NAMESPACE);
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

        OverwriteConfigHandler handler = new OverwriteConfigHandler(config,
                appDir.toPath());
        handler.install();
        assertEquals(Lists.<String> newArrayList("<" + SKOS.PREF_LABEL + ">"),
                config.getUiConfig().getPreferredLabels());
        assertThat(
                appender.getLogMessages(),
                hasItems(
                        "Copied none-existing config property \"preferredLabels = skos:prefLabel\" to \"ui.prop\".",
                        "Copied none-existing config property \"homePage = StartTest123\" to \"global.prop\"."));
    }

    @Test
    public void copyingNoneExistingPropertyFiles() throws IOException {
        final File appDir = createTestAppDir();
        final File pluginConfigPropFile = new File(appDir, "/config/myAppConfig2.prop");
        assertTrue(pluginConfigPropFile.createNewFile());
        
        FileUtils.writeLines(pluginConfigPropFile, Lists.newArrayList("testProperty2 = testValue2"));
        
        final File plaformConfigDir = new File(Configuration.getConfigBasePath());
        final File plaformCustomConfigPropFile = new File(plaformConfigDir,"myAppConfig2.prop");
        assertFalse(plaformCustomConfigPropFile.exists());
        
        OverwriteConfigHandler handler = new OverwriteConfigHandler(config, appDir.toPath());
        handler.install();
        
        assertTrue(plaformCustomConfigPropFile.exists());
        
        assertEquals(
                Lists.<String>newArrayList("testProperty2 = testValue2") , 
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
        return Lists.newArrayList(OverwriteConfigHandler.class,ConfigBaseInstallationHandler.class);
    }

}