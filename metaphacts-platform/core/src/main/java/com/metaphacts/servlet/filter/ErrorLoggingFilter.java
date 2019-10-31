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

import java.io.IOException;

import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.common.base.Throwables;

/**
 * A {@link Filter} making sure that uncaught exceptions are written to the
 * platform log.
 * <p>
 * All exceptions are explicitly re-thrown to be handled by the web application.
 * The purpose of this filter is solely to log the errors.
 * </p>
 * <p>
 * Note that these are also logged by the jetty web server, however, this is
 * written to a different log and thus not visible in our main log.
 * </p>
 * 
 * @author as
 *
 */
@Singleton
@WebFilter
public class ErrorLoggingFilter implements Filter {

    private static final Logger logger = LogManager.getLogger(ErrorLoggingFilter.class);

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // no-op
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        try {
            chain.doFilter(request, response);
        } catch (Throwable t) {

            String requestDetails = "";
            if (request instanceof HttpServletRequest) {
                requestDetails = "to '" + ((HttpServletRequest) request).getRequestURI() + "'";
            }
            logger.warn("Unexpected error while handling request " + requestDetails + ": " + t.getMessage());
            logger.debug("Details: ", t);

            // explicitly re-throw original exception to the servlet handler
            Throwables.throwIfUnchecked(t);
            Throwables.throwIfInstanceOf(t, ServletException.class);
            Throwables.throwIfInstanceOf(t, IOException.class);
            throw new RuntimeException(t);
        }

    }

    @Override
    public void destroy() {
        // no-op
    }

}
