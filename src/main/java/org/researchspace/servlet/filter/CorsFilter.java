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

package org.researchspace.servlet.filter;

import java.io.IOException;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.HttpMethod;

import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.web.util.WebUtils;
import org.researchspace.config.Configuration;
import org.researchspace.security.OptionalBasicAuthFilter;

/**
 * See also {@link OptionalBasicAuthFilter}
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@WebFilter
public class CorsFilter implements Filter {

    private static final String WILD_CARD_ORIGIN = "*";

    @Inject
    private Configuration config;

    public static boolean isCorsPreFlightRequest(Configuration config, ServletRequest request) {
        if (StringUtils.isNoneEmpty(config.getEnvironmentConfig().getAllowedCrossOrigin())) {
            HttpServletRequest httpRequest = WebUtils.toHttp(request);
            String httpMethod = httpRequest.getMethod();
            return httpMethod.equalsIgnoreCase(HttpMethod.OPTIONS);
        } else {
            return false;
        }
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse resp = ((HttpServletResponse) response);
        HttpServletRequest req = (HttpServletRequest) request;

        // if cors origin is null, this filter will just pass the filter chain
        String corsOrigin = config.getEnvironmentConfig().getAllowedCrossOrigin();
        String requestOrigin = req.getHeader("origin");
        if (StringUtils.isNotEmpty(corsOrigin) && StringUtils.isNotEmpty(requestOrigin)) {
            boolean originIsAllowed = corsOrigin.equals(WILD_CARD_ORIGIN) || corsOrigin.contains(requestOrigin);
            if (originIsAllowed) {
                // according to standard when authorization is enabled one can't return wildcard
                // or list of origins as allowed
                // one needs to always return concrete origin
                resp.setHeader("Access-Control-Allow-Origin", requestOrigin);
                resp.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, authorization");
                resp.setHeader("Access-Control-Allow-Credentials", "true");
                // TODO maybe later we need to move this to a config to provide more control
                resp.setHeader("Access-Control-Allow-Methods",
                        String.join(",", HttpMethod.DELETE, HttpMethod.GET, HttpMethod.POST, HttpMethod.HEAD));
                // how long results might be cached from cors
                resp.setHeader("Access-Control-Max-Age", "86400");
            }
        }
        chain.doFilter(request, response);

    }

    @Override
    public void destroy() {
    }

}
