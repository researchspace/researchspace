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

package org.researchspace.security;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.core.HttpHeaders;

import org.apache.shiro.web.filter.authc.BasicHttpAuthenticationFilter;
import org.researchspace.config.Configuration;
import org.researchspace.servlet.filter.CorsFilter;

/**
 * A modified shiro {@link BasicHttpAuthenticationFilter} that MUST only be used
 * in combination with a session based authentication filter such as
 * {@link FormAuthenticationFilter}. To allow for proper basic http
 * authentication, the {@link BasicHttpAuthenticationFilter} MUST be placed
 * before any other authentication filter in the filter chain.
 * <p>
 * The filter checks whether the request is an basic authentication attempt
 * (i.e. whether authc headers are being set in the request). If not it will
 * pass on the authentication challenge to the filter chain. That is why this
 * filter <b>MUST</b> only be used in combination with other authentication
 * filters.
 * </p>
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
public class OptionalBasicAuthFilter extends BasicHttpAuthenticationFilter {

    @Inject
    private Configuration config;

    @Override
    protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) {
        // if CORS is enabled we can't request authentication for OPTIONS requests
        // because browsers don't send basic auth headers for pre-flight requests
        if (CorsFilter.isCorsPreFlightRequest(config, request)) {
            return true;
        } else {
            return super.isAccessAllowed(request, response, mappedValue);
        }
    }

    /**
     * Overwrites
     * {@link BasicHttpAuthenticationFilter#onPreHandle(ServletRequest, ServletResponse, Object)}
     * in order to disable basic auth login challange, we don't need that.
     * Basic auth shouldn't be used from a browser or any other similar user agent.
     */
    @Override
    protected boolean onAccessDenied(ServletRequest request, ServletResponse response) throws Exception {
        // check if request has authorization header
        if (isLoginAttempt(request, response)) {
            return super.onAccessDenied(request, response);
        } else {
            // it means we are not dealing with basic auth, pass on request to authc filter
            return true;
        }
    }

    /**
     * Check if request is basic auth authorization attempt.
     */
    public static boolean isAuthorizationAttempt(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if ( authHeader != null) {
            return authHeader.toLowerCase().startsWith(HttpServletRequest.BASIC_AUTH.toLowerCase());
        } else {
            return false;
        }
    }
}
