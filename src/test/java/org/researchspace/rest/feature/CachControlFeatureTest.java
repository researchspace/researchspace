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

package org.researchspace.rest.feature;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;

import org.apache.commons.io.IOUtils;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTestNg;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.rest.feature.CacheControlFeature;
import org.researchspace.rest.feature.CacheControl.Cache;
import org.researchspace.rest.feature.CacheControl.MaxAgeCache;
import org.researchspace.rest.feature.CacheControl.NoCache;

/**
 * Tests to assert that value cache control annotations are injected into the
 * cache control response headers via the {@link CacheControlFeature}.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class CachControlFeatureTest extends JerseyTestNg.ContainerPerClassTest {

    @Override
    protected Application configure() {
        return new ResourceConfig().register(NoCacheControlClassTestEndpoint.class)
                .register(MaxAgeCacheControlClassTestEndpoint.class).register(CacheControlClassTestEndpoint.class)
                .register(CacheControlMethodsTestEndpoint.class).register(CacheControlFeature.class);

    }

    @Test
    public void classCacheControlAnnotationShouldInjectNoCacheControl() throws IOException {
        Response response = target("/no-cache-control-class").request().get();
        Assert.assertEquals("Hello no cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("max-age=0, no-cache, no-store, must-revalidate",
                response.getHeaderString(HttpHeaders.CACHE_CONTROL));
    }

    @Test
    public void classCacheControlAnnotationShouldInjectCacheControl() throws IOException {
        Response response = target("/cache-control-class").request().get();
        Assert.assertEquals("Hello user defined cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("must-revalidate", response.getHeaderString(HttpHeaders.CACHE_CONTROL));
    }

    @Test
    public void classMaxAgeCacheControlAnnotationShouldInjectCacheControl() throws IOException {
        Response response = target("/max-age-cache-control-class").request().get();
        Assert.assertEquals("Hello max age cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("max-age=360", response.getHeaderString(HttpHeaders.CACHE_CONTROL));
    }

    @Test
    public void methodCacheControlAnnotationShouldInjectCacheControl() throws IOException {
        Response response = target("/cache-control-methods/no-cache").request().get();
        Assert.assertEquals("Hello no cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("max-age=0, no-cache, no-store, must-revalidate",
                response.getHeaderString(HttpHeaders.CACHE_CONTROL));

        response = target("/cache-control-methods/max-age").request().post(null);
        Assert.assertEquals("Hello max age cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("max-age=300", response.getHeaderString(HttpHeaders.CACHE_CONTROL));

        response = target("/cache-control-methods/cache-control").request().get();
        Assert.assertEquals("Hello user defined cache control value",
                IOUtils.toString((InputStream) response.getEntity(), StandardCharsets.UTF_8));
        Assert.assertEquals("must-revalidate", response.getHeaderString(HttpHeaders.CACHE_CONTROL));
    }

    @Path("/no-cache-control-class")
    @NoCache
    public static class NoCacheControlClassTestEndpoint {
        @GET
        public Response getMessage() {
            return Response.ok().entity("Hello no cache control value").build();
        }
    }

    @Path("/cache-control-class")
    @Cache("must-revalidate")
    public static class CacheControlClassTestEndpoint {
        @GET
        public Response getMessage() {
            return Response.ok().entity("Hello user defined cache control value").build();
        }
    }

    @Path("/max-age-cache-control-class")
    @MaxAgeCache(time = 6, unit = TimeUnit.MINUTES)
    public static class MaxAgeCacheControlClassTestEndpoint {
        @GET
        public Response getMessage() {
            return Response.ok().entity("Hello max age cache control value").build();
        }
    }

    @Path("/cache-control-methods")
    public static class CacheControlMethodsTestEndpoint {
        @Path("/no-cache")
        @GET
        @NoCache
        public Response noCache() {
            return Response.ok().entity("Hello no cache control value").build();
        }

        @Path("/max-age")
        @POST
        @MaxAgeCache(time = 5, unit = TimeUnit.MINUTES)
        public Response maxAge() {
            return Response.ok().entity("Hello max age cache control value").build();
        }

        @Path("/cache-control")
        @GET
        @Cache("must-revalidate")
        public Response cache() {
            return Response.ok().entity("Hello user defined cache control value").build();
        }
    }
}