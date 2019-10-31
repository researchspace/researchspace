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

package com.metaphacts.rest.endpoint;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.io.FileUtils;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.Sets;
import com.metaphacts.junit.MetaphactsJerseyTest;

public class LogAdminEndpointTest extends MetaphactsJerseyTest {

    private final String logsPermissionsShiroFile = "classpath:com/metaphacts/rest/endpoint/shiro-logs.ini";

    private File previousLogsDir = null;
    private File logsDir = null;

    @Rule
    public TemporaryFolder tmpFolder = new TemporaryFolder();

    @Before
    public void before() throws Exception {

        logsDir = tmpFolder.newFolder("logs");
        previousLogsDir = LogAdminEndpoint.LOGS_DIRECTORY;
        LogAdminEndpoint.LOGS_DIRECTORY = logsDir;
    }

    @After
    public void after() throws Exception {

        LogAdminEndpoint.LOGS_DIRECTORY = previousLogsDir;
    }

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(LogAdminEndpoint.class);
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testListLogsSimple() throws Exception {

        createLogFile("platform-debug.log", "INFO log1");

        Response response = target("admin/logs").request().get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());

        @SuppressWarnings("unchecked")
        List<Map<String, String>> logJson = Arrays.asList(response.readEntity(Map[].class));

        Assert.assertEquals(1, logJson.size());
        Assert.assertEquals(Sets.newHashSet("name", "relativePath"), logJson.get(0).keySet());
        Assert.assertEquals("platform-debug.log", logJson.get(0).get("name"));
        Assert.assertEquals("platform-debug.log", logJson.get(0).get("relativePath"));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testListLogsRecursive() throws Exception {

        createLogFile("platform-debug.log", "INFO log1");
        createLogFile("platform-logins.log", "INFO log2");
        createLogFile("platform-debug-1.log", "platform-debug", "INFO rotated log");

        Response response = target("admin/logs").queryParam("recursive", true).request().get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());

        @SuppressWarnings("unchecked")
        List<Map<String, String>> logJson = Arrays.asList(response.readEntity(Map[].class));

        Assert.assertEquals(3, logJson.size());
        Assert.assertEquals(
                Sets.newHashSet("platform-debug.log", "platform-logins.log", "platform-debug/platform-debug-1.log"),
                logJson.stream().map(m -> m.get("relativePath")).collect(Collectors.toSet()));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testListLogsSubfolder() throws Exception {

        createLogFile("platform-debug.log", "INFO log1");
        createLogFile("platform-logins.log", "INFO log2");
        createLogFile("platform-debug-1.log", "platform-debug", "INFO rotated log");

        Response response = target("admin/logs").queryParam("subfolder", "platform-debug").request().get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());

        @SuppressWarnings("unchecked")
        List<Map<String, String>> logJson = Arrays.asList(response.readEntity(Map[].class));

        Assert.assertEquals(1, logJson.size());
        Assert.assertEquals(Sets.newHashSet("platform-debug/platform-debug-1.log"),
                logJson.stream().map(m -> m.get("relativePath")).collect(Collectors.toSet()));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testListLogs_ResideInsideLogs() throws Exception {

        File otherFolder = tmpFolder.newFolder("otherFolder");
        FileUtils.write(new File(otherFolder, "someFile.log"), "File outside logs", "UTF-8");

        createLogFile("platform-debug.log", "INFO log1");

        Response response = target("admin/logs").queryParam("subfolder", "../otherFolder").request().get();
        Assert.assertEquals(Status.NO_CONTENT.getStatusCode(), response.getStatus());
        Assert.assertTrue(response.readEntity(String.class).isEmpty());
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testReadLog() throws Exception {

        createLogFile("platform-debug.log", "INFO log1");

        Response response = target("admin/logs/platform-debug.log").request().get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
        Assert.assertEquals("INFO log1", response.readEntity(String.class));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testReadLogSubfolder() throws Exception {

        createLogFile("platform-debug-1.log", "platform-debug", "INFO log1 in subfolder");

        Response response = target("admin/logs/platform-debug/platform-debug-1.log").request().get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
        Assert.assertEquals("INFO log1 in subfolder", response.readEntity(String.class));
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = logsPermissionsShiroFile)
    public void testReadLogSubfolder_ResideInSubfolder() throws Exception {

        File otherFolder = tmpFolder.newFolder("otherFolder");
        FileUtils.write(new File(otherFolder, "someFile.log"), "File outside logs", "UTF-8");

        createLogFile("platform-debug.log", "INFO log1");

        Response response = target("admin/logs/../otherFolder/someFile.log").request().get();
        Assert.assertEquals(Status.NO_CONTENT.getStatusCode(), response.getStatus());
    }


    protected void createLogFile(String name, String content) throws IOException {
        createLogFile(name, null, content);
    }

    protected void createLogFile(String name, String subFolder, String content) throws IOException {
        File logsFolder = logsDir;
        if (subFolder != null) {
            logsFolder = new File(logsDir, subFolder);
            logsFolder.mkdirs();
        }
        FileUtils.write(new File(logsFolder, name), content, "UTF-8");
    }
}
