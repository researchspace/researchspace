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

package org.researchspace.rest.filter;

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
import org.researchspace.junit.LogAppenderRule;
import org.researchspace.junit.JerseyTest;
import org.researchspace.servlet.filter.MDCFilter;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.ImmutableMap;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MDCFilterTest extends JerseyTest {
    private final String queryContainerPermissionsShiroFile = "classpath:org/researchspace/rest/endpoint/shiro-query-container.ini";

    @Rule
    public ShiroRule shiroRule = new ShiroRule();

    PatternLayout layout = PatternLayout.newBuilder().withPattern("%X{} - %m%n").withCharset(Charset.defaultCharset())
            .build();

    @Rule
    public LogAppenderRule<?> logAppenderRule = new LogAppenderRule<>(
            ImmutableMap.of(org.researchspace.rest.filter.MDCFilterTest.MDCTestEndpoint.class, Level.DEBUG));

    @Override
    protected void register(ResourceConfig resourceConfig) {
        // here the MDCFilter will be invoked as ContainerRequestFilter, since
        // in JerseyTest one can not easily add servlet filters without deploying into a
        // servlet container
        // c.f. https://stackoverflow.com/questions/20744996/filters-in-jerseytest-2-x
        resourceConfig.register(MDCFilter.class).register(MDCTestEndpoint.class);
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void adminShouldBeInjectedAsMDC() throws IOException {
        target("/mdc-test-endpoint").request().get();
        assertThat(logAppenderRule.getLogMessagesWithContextMap().get("Hello World 1"),
                IsMapContaining.hasEntry("userPrincipal", "admin"));
    }

    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = queryContainerPermissionsShiroFile)
    public void guestShouldBeInjectedAsMDC() throws IOException {
        target("/mdc-test-endpoint").request().get();
        assertThat(logAppenderRule.getLogMessagesWithContextMap().get("Hello World 1"),
                IsMapContaining.hasEntry("userPrincipal", "guest"));
    }

    @Path("/mdc-test-endpoint")
    public static class MDCTestEndpoint {
        private static final Logger logger = LogManager
                .getLogger(org.researchspace.rest.filter.MDCFilterTest.MDCTestEndpoint.class);

        @GET
        public Response get() {
            logger.debug("Hello World 1");
            return Response.ok().build();
        }
    }

}
