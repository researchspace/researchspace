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

package org.researchspace.rest.endpoint;

import javax.inject.Inject;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.glassfish.jersey.server.ResourceConfig;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.junit.JerseyTest;
import org.researchspace.junit.ResearchSpaceShiroRule;
import org.researchspace.rest.endpoint.TemplateEndpoint;

import com.github.sdorra.shiro.SubjectAware;

public class TemplateEndpointTest extends JerseyTest {
    private final String templatePermissionShiroFile = "classpath:org/researchspace/security/shiro-templates-rights.ini";

    @Inject
    public Configuration configuration;

    @Inject
    private CacheManager cacheManager;

    @Rule
    public ResearchSpaceShiroRule rule = new ResearchSpaceShiroRule(() -> configuration).withCacheManager(() -> cacheManager);

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(TemplateEndpoint.class);
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = templatePermissionShiroFile)
    public void testRegexPermission() throws Exception {
        Response resp = target("template/html")
                .queryParam("iri", "http://www.researchspace.org/resource/admin/SomeAdminPage").request().get();
        Assert.assertEquals(Status.OK, resp.getStatusInfo());
        resp = target("template/source").queryParam("iri", "http://www.researchspace.org/resource/admin/SomeAdminPage")
                .request().get();
        Assert.assertEquals(Status.FORBIDDEN, resp.getStatusInfo());
        resp = target("template/source").queryParam("iri", "http://www.researchspace.org/resource/test/test").request()
                .get();
        Assert.assertEquals(Status.OK, resp.getStatusInfo());
    }

}
