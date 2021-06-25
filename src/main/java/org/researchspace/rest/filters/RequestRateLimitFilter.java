/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.rest.filters;

import java.io.IOException;

import javax.ws.rs.client.ClientRequestContext;
import javax.ws.rs.client.ClientRequestFilter;

import com.google.common.util.concurrent.RateLimiter;

/**
 * Can be used together with JAX-RS (Jersey) client to limit number of requests
 * that can be issued per second.
 * 
 * @author Artem Kozlov
 */
public class RequestRateLimitFilter implements ClientRequestFilter {

    private RateLimiter rateLimiter;

    public RequestRateLimitFilter(int rateLimitPerSecond) {
        this.rateLimiter = RateLimiter.create(rateLimitPerSecond);
    }

    @Override
    public void filter(ClientRequestContext requestContext) throws IOException {
        rateLimiter.acquire();
    }
}
