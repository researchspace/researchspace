/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.sail.rest;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.Test;
import org.researchspace.config.Configuration;
import org.researchspace.config.groups.EnvironmentConfiguration;
import org.researchspace.rest.filters.UserAgentFilter;

/**
 * The platform-wide {@code httpUserAgent} setting (environment.prop) is
 * documented to apply to "all outgoing HTTP requests (SPARQL endpoints and
 * REST services)" — REST sails must fall back to it when no per-repository
 * {@code ephedra:userAgent} override is configured. This is exactly the
 * Wikimedia/Nominatim User-Agent-policy use case the setting exists for.
 */
public class RESTSailUserAgentTest {

    @Test
    public void perRepositoryOverrideWins() {
        RESTSailConfig config = new RESTSailConfig();
        config.setUserAgent("PerRepo/2.0 (https://example.org)");

        Configuration systemConfig = mockSystemConfig("Platform/1.0 (https://example.org)");
        UserAgentFilter filter = RESTSail.createUserAgentFilter(config, systemConfig);
        assertEquals("PerRepo/2.0 (https://example.org)", filter.getUserAgent());
    }

    @Test
    public void platformHttpUserAgentAppliesToRestServices() {
        RESTSailConfig config = new RESTSailConfig();

        Configuration systemConfig = mockSystemConfig("MyProject/1.0 (https://example.org; admin@example.org)");
        UserAgentFilter filter = RESTSail.createUserAgentFilter(config, systemConfig);
        assertEquals("the configured httpUserAgent must reach REST service requests",
                "MyProject/1.0 (https://example.org; admin@example.org)", filter.getUserAgent());
    }

    @Test
    public void hardcodedDefaultAsLastResort() {
        RESTSailConfig config = new RESTSailConfig();
        UserAgentFilter filter = RESTSail.createUserAgentFilter(config, null);
        assertEquals("ResearchSpace/1.0 (https://www.researchspace.org/)", filter.getUserAgent());
    }

    private Configuration mockSystemConfig(String userAgent) {
        Configuration configuration = mock(Configuration.class);
        EnvironmentConfiguration environmentConfig = mock(EnvironmentConfiguration.class);
        when(configuration.getEnvironmentConfig()).thenReturn(environmentConfig);
        when(environmentConfig.getHttpUserAgent()).thenReturn(userAgent);
        return configuration;
    }
}
