/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;

import org.eclipse.rdf4j.sail.SailException;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;
import org.researchspace.rest.filters.RequestRateLimitFilter;
import org.researchspace.rest.filters.UserAgentFilter;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */
public class RESTSail extends AbstractServiceWrappingSail<RESTSailConfig> {

    /**
     * According to the documentation of JAX-RS, "initialization as well as disposal
     * of client may be a rather expensive operation", so we want to make sure that
     * we reuse the same client instance for all calls for the specific service.
     * 
     * In Jersey Client is threadsafe, so it is fine to have the single instance in
     * the sail and access it from multiple sail connections.
     */
    private Client client;

    public RESTSail(RESTSailConfig config) {
        super(config);
    }

    @Override
    protected RESTSailConnection getConnectionInternal() throws SailException {
        return new RESTSailConnection(this);
    }

    @Override
    protected void initializeInternal() throws SailException {
        super.initializeInternal();
        RESTSailConfig config = this.getConfig();

        // client Jersey HTTP client with Request Rate Limiter filter if request limit
        // is specified in the config
        var clientBuilder = ClientBuilder.newBuilder();
        if (config.getRequestRateLimit() != null) {
            clientBuilder = clientBuilder.register(new RequestRateLimitFilter(config.getRequestRateLimit()));
        }

        // it is a good practice to always include application user-agent into all
        // requests and somtime it can be even the requirement, e.g nominatim web
        // service from OSM 
        if (config.getUserAgent() != null) {
            clientBuilder = clientBuilder.register(new UserAgentFilter(config.getUserAgent()));
        } else {
            clientBuilder = clientBuilder.register(new UserAgentFilter());
        }

        // if we have username and password in the config then conigure basic auth
        if (config.getUsername() != null && config.getPassword() != null) {
            HttpAuthenticationFeature basicAuthFeature = HttpAuthenticationFeature.basic(config.getUsername(),
                    config.getPassword());
            clientBuilder = clientBuilder.register(basicAuthFeature);
        }

        this.client = clientBuilder.build();
    }

    protected Client getClient() {
        return client;
    }
}
