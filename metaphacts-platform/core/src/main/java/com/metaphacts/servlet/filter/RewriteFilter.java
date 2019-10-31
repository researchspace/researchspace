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

package com.metaphacts.servlet.filter;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.message.BasicNameValuePair;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.List;

/**
 * Filter to redirect resource access by IRI to a canonical URL, e.g.
 *
 * http://example.org/person/foo -> http://example.com/resource/?uri=http://example.com/person/foo
 * 
 * @author Alexey Morozov
 */
@Singleton
@WebFilter
public class RewriteFilter implements Filter {
    @Inject
    private Configuration config;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = (HttpServletRequest)request;
            String path = httpRequest.getRequestURI().substring(
                httpRequest.getContextPath().length());

            if (!path.isEmpty() && isAccessibleByIri(path)) {
                String platformBaseIri = config.getEnvironmentConfig().getPlatformBaseIri();
                List<NameValuePair> params = Lists.newArrayList(
                    new BasicNameValuePair("uri", platformBaseIri + path));

                if (httpRequest.getQueryString() != null) {
                    params.addAll(URLEncodedUtils.parse(httpRequest.getQueryString(), null));
                }

                String resourcePathMapping = config.getEnvironmentConfig().getResourceUrlMapping();
                String newPath = platformBaseIri + resourcePathMapping
                    + "?" + URLEncodedUtils.format(params, (Charset)null);

                HttpServletResponse httpServletResponse = (HttpServletResponse) response;
                httpServletResponse.sendRedirect(httpServletResponse.encodeRedirectURL(newPath));
            }
        }
        chain.doFilter(request, response);
    }

    private boolean isAccessibleByIri(String iriPath) {
        return config.getEnvironmentConfig().getPathsToRewrite()
            .stream().anyMatch(iriPath::startsWith);
    }

    @Override
    public void destroy() {}
}
