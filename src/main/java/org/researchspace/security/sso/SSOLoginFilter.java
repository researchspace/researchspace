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

package org.researchspace.security.sso;

import java.io.IOException;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.researchspace.config.Configuration;
import org.researchspace.servlet.filter.CorsFilter;

import io.buji.pac4j.filter.SecurityFilter;
import io.buji.pac4j.filter.LogoutFilter;

/**
 * Provides an SSO login endpoint
 */
@Singleton
public class SSOLoginFilter implements Filter {

    /**
     * Name of the security and logout filter parameters in the shiro INI configuration file.
     *
     * @see researchspace.security.sso.shiro-sso-oauth-default.ini
     * @see researchspace.security.sso.shiro-sso-saml-default.ini
     */
    private static final String SECURITY_FILTER = "securityFilter";
    private static final String LOGOUT_FILTER = "logoutFilter";

    private SecurityFilter securityFilter;
    private LogoutFilter logoutFilter;

    private Configuration config;

    @Inject
    public SSOLoginFilter(SSOEnvironment env, Configuration config) {
        super();
        this.config = config;
        this.securityFilter = env.getObject(SECURITY_FILTER, SecurityFilter.class);
        this.logoutFilter = env.getObject(LOGOUT_FILTER, LogoutFilter.class);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

            this.logoutFilter.doFilter(request, response, chain);
            this.securityFilter.doFilter(request, response, chain); 
    }

    @Override
    public void destroy() {
        this.securityFilter.destroy();
        this.logoutFilter.destroy();
    }
}