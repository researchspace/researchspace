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

package com.metaphacts.rest.filter;

import static org.hamcrest.MatcherAssert.assertThat;

import java.io.IOException;
import java.nio.charset.Charset;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.glassfish.jersey.server.ResourceConfig;
import org.hamcrest.collection.IsMapContaining;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.ImmutableMap;
import com.metaphacts.junit.LogAppenderRule;
import com.metaphacts.junit.MetaphactsJerseyTest;
import com.metaphacts.servlet.filter.MDCFilter;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MDCFilterTest extends MetaphactsJerseyTest {
    private final String queryContainerPermissionsShiroFile = "classpath:com/metaphacts/rest/endpoint/shiro-query-container.ini";

    @Rule
    public ShiroRule shiroRule = new ShiroRule();
    
    PatternLayout layout= PatternLayout.newBuilder().withPattern("%X{} - %m%n").withCharset(Charset.defaultCharset()).build();
    
    @Rule
    public LogAppenderRule<?> logAppenderRule = new LogAppenderRule<>(
                ImmutableMap.of(
                        com.metaphacts.rest.filter.MDCFilterTest.MDCTestEndpoint.class, Level.DEBUG
                )
            );
    
    @Override
    protected void register(ResourceConfig resourceConfig) {
        // here the MDCFilter will be invoked as ContainerRequestFilter, since
        // in JerseyTest one can not easily add servlet filters without deploying into a servlet container
        // c.f. https://stackoverflow.com/questions/20744996/filters-in-jerseytest-2-x
        resourceConfig.register(MDCFilter.class)
            .register(MDCTestEndpoint.class);
    }
                
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void adminShouldBeInjectedAsMDC() throws IOException {
        target("/mdc-test-endpoint").request().get();
        assertThat(logAppenderRule.getLogMessagesWithContextMap().get("Hello World 1"),  IsMapContaining.hasEntry("userPrincipal","admin"));
    }
    
    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = queryContainerPermissionsShiroFile)
    public void guestShouldBeInjectedAsMDC() throws IOException {
        target("/mdc-test-endpoint").request().get();
        assertThat(logAppenderRule.getLogMessagesWithContextMap().get("Hello World 1"),  IsMapContaining.hasEntry("userPrincipal","guest"));
    }
    

    
    @Path("/mdc-test-endpoint")
    public static class MDCTestEndpoint {
        private static final Logger logger = LogManager.getLogger(com.metaphacts.rest.filter.MDCFilterTest.MDCTestEndpoint.class);

        @GET
        public Response get() {
            logger.debug("Hello World 1");
            return Response.ok().build();
        }
    }

}
