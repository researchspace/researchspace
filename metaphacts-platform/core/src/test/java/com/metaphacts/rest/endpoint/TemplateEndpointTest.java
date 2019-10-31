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

import javax.inject.Inject;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.shiro.SecurityUtils;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.metaphacts.junit.MetaphactsJerseyTest;
import com.metaphacts.junit.MetaphactsShiroRule;
import com.metaphacts.security.MetaphactsSecurityManager;

public class TemplateEndpointTest extends MetaphactsJerseyTest {
    private final String templatePermissionShiroFile = "classpath:com/metaphacts/security/shiro-templates-rights.ini";
    
    @Rule
    public MetaphactsShiroRule rule = new MetaphactsShiroRule();
    
    @Inject
    public MetaphactsSecurityManager securityManager;

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(TemplateEndpoint.class);
    }

    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = templatePermissionShiroFile
    )
    public void testRegexPermission() throws Exception {
        Response resp = target("template/html").queryParam("iri", "http://www.metaphacts.com/resource/admin/SomeAdminPage").request().get();
        Assert.assertEquals(Status.OK, resp.getStatusInfo());
        resp = target("template/source").queryParam("iri", "http://www.metaphacts.com/resource/admin/SomeAdminPage").request().get();
        Assert.assertEquals(Status.FORBIDDEN, resp.getStatusInfo());
        resp = target("template/source").queryParam("iri", "http://www.metaphacts.com/resource/test/test").request().get();
        Assert.assertEquals(Status.OK, resp.getStatusInfo());
    }
    
}
