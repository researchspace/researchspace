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

package com.metaphacts.security.sso;

import java.io.IOException;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import io.buji.pac4j.filter.LogoutFilter;

/**
 * @author Artem Kozlov {@literal <ak@metaphacts.com>}
 */
@Singleton
public class SSOLogoutFilter implements Filter {

    private static final String LOGOUT_FILTER = "logoutFilter";

    private LogoutFilter logoutFilter;

    @Inject
    public SSOLogoutFilter(SSOEnvironment env) {
        this.logoutFilter = env.getObject(LOGOUT_FILTER, LogoutFilter.class);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        this.logoutFilter.doFilter(request, response, chain);
    }

    @Override
    public void destroy() {
        this.logoutFilter.destroy();
    }
}
