/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.security;

import java.io.IOException;

import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

import com.google.inject.Inject;
import com.google.inject.name.Named;

/**
 * Custom extension of shiro's default to disable redirect caching of the login url by setting the
 * respective HTTP response header.
 * 
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class FormAuthenticationFilter extends org.apache.shiro.web.filter.authc.FormAuthenticationFilter {
    
    @Override
    protected void redirectToLogin(ServletRequest request, ServletResponse response)
            throws IOException {
        // set header to force e.g. Safari not do cache the resulting redirect
        // header("Cache-Control: max-age=0, no-cache, no-store, must-revalidate");
        if (response instanceof HttpServletResponse) {
            HttpServletResponse httpResponse = ((HttpServletResponse) response);
            httpResponse.setHeader("cache-control",
                    "max-age=0, no-cache, no-store, must-revalidate");
        }

        super.redirectToLogin(request, response);
    }
    
    @Inject
    @Override
    public void setLoginUrl(@Named("authc.loginUrl") String loginUrl) {
        super.setLoginUrl(loginUrl);
    }
}