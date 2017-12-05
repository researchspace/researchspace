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

import static org.junit.Assert.assertEquals;

import java.io.File;
import java.io.IOException;
import java.util.List;

import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.rules.TemporaryFolder;

import com.google.common.collect.Lists;
import com.metaphacts.config.ConfigurationUtil;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.junit.TestLogAppender;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public abstract class InstallationHandlerTest extends AbstractIntegrationTest {
    @Rule
    public TemporaryFolder pluginTestDir = new TemporaryFolder();

    protected TestLogAppender appender;

    @Before
    public void setup() throws IOException{
        /* START CONFIGURE TEST LOG APPENDER */

         /* TODO move this into reusable test rule if needed */
        final LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
        final org.apache.logging.log4j.core.config.Configuration logConfig = ctx.getConfiguration();
        appender = TestLogAppender.createAppender("TestAppender", null, null, null);
        appender.start();
        for(Class<?> clazz : getClassesToLog()){
            Logger classLogger = LogManager.getLogger(clazz);
            logConfig.addLoggerAppender((org.apache.logging.log4j.core.Logger) classLogger, appender);
            LoggerConfig loggerConfig = logConfig.getLoggerConfig(classLogger.getName());
            loggerConfig.setLevel(Level.DEBUG);
        }

        ctx.updateLoggers();
        /*  END CONFIGURE TEST LOG APPENDER */

        File appsDir = new File(pluginTestDir.newFolder(), "apps");
        FileUtils.forceMkdir(appsDir);
        System.setProperty(
                ConfigurationUtil.configParamToSystemParam(config.getEnvironmentConfig().getId(),"appsDirectory"),
                appsDir.getAbsolutePath()
                );

        assertEquals(appsDir.getAbsolutePath(), config.getEnvironmentConfig().getAppsDirectory());
    }

    @After
    public void tearDown() throws IOException{
        // reset app directory
        System.clearProperty(
                ConfigurationUtil.configParamToSystemParam(config.getEnvironmentConfig().getId(),"appsDirectory")
                );
        
        // CLEAR MEASSAGE FROM TEST LOG APPENDER
        // TODO move to rule if needed
        appender.clearLogMessages();
        
        FileUtils.writeLines(config.getUiConfig().getConfigFile(), Lists.<String>newArrayList(), false);
        config.getUiConfig().resetResult();
        
        FileUtils.writeLines(config.getGlobalConfig().getConfigFile(), Lists.<String>newArrayList(), false);
        config.getGlobalConfig().resetResult();
        assertCleanConfiguration();
    }

    private void assertCleanConfiguration() {
        assertEquals(
                Lists.<String> newArrayList("<" + RDFS.LABEL.stringValue() + ">"), 
                config.getUiConfig().getPreferredLabels()
        );
        assertEquals(Lists.<String>newArrayList("en"), config.getUiConfig().getPreferredLanguages());
        assertEquals(Lists.<String>newArrayList("<http://schema.org/thumbnail>"), config.getUiConfig().getPreferredThumbnails());
        assertEquals("Help:Start", config.getGlobalConfig().getHomePage());
    }

    protected File createTestAppDir() throws IOException{
        File appDir = new File(config.getEnvironmentConfig().getAppsDirectory(), "testApp");
        FileUtils.forceMkdir(appDir);
        FileUtils.forceMkdir(new File(appDir,"config"));
        FileUtils.forceMkdir(new File(appDir,"data/templates"));
        return appDir;
    }

    protected abstract List<Class<? extends PluginBaseInstallationHandler>> getClassesToLog();
}