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

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Context;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.ThreadContext;
import org.apache.shiro.SecurityUtils;
import org.researchspace.di.PlatformGuiceModule;

import com.google.common.net.HttpHeaders;
import com.google.inject.Singleton;

/**
 * Filter to enable injection of MDC (Mapped Diagnostic Context) variables on
 * entire rest container endpoints to enable access to HTTP specific variables
 * such as IP address or user principal via a Mapped Diagnostic Context (c.f.
 * {@link MDCFilter}).
 * 
 * <p>
 * The filter will be invoked on all servlet request path as specified in
 * {@link PlatformGuiceModule}.
 * </p>
 * 
 * <p>
 * Where this is not possible the static method
 * {@link #wrapIntoMDC(VoidAction, HttpServletRequest)} can be used to wrap
 * individual log commands into a MDC.
 * </p>
 * 
 * Values from the MDC context map can be accessed in the logging patterns using
 * the following keys:
 * 
 * <ul>
 * <li><code>%X{clientIpAddress}</code> - Will return the <i>X-Forwarded-For</i>
 * header, if set e.g. by a proxy. Otherwise it will return the remote IP
 * address, which will be either the client or any intermediate proxy IP
 * address.</li>
 * 
 * <li><code>%X{ipAddress}</code> - Will return the the remote IP address, which
 * will be either the client or any intermediate proxy IP address.</li>
 * 
 * <li><code>%X{userPrincipal}</code> - Will return the user principal.</li>
 * </ul>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */

@Singleton
public class MDCFilter implements Filter, ContainerRequestFilter { // implements ContainerRequestFilter to ease junit
                                                                   // testing
    private static Logger logger = LogManager.getLogger(MDCFilter.class);

    @Context
    private HttpServletRequest httpRequest;

    /*
     * keys as the can be used in the logging pattern configuration to access values
     * from the MDC map
     */
    private static final String CLIENT_IP_ADDRESS = "clientIpAddress";
    private static final String REMOTE_OR_PROXY_IP_ADDRESS = "ipAddress";
    private static final String USER_PRINCIPAL = "userPrincipal";

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        logger.info("Init MDC Filter.");
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        setHttpMDC((HttpServletRequest) request);
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
        destroyHttpMDC();

    }

    private static void setHttpMDC(HttpServletRequest httpRequest) {

        logger.trace("Setting-up MDC");
        String xforwaredIP = httpRequest.getHeader(HttpHeaders.X_FORWARDED_FOR);
        // getRomteAddr returns only address of the client or last proxy that sent the
        // request
        String remoteIpAddress = httpRequest.getRemoteAddr();
        String clientIpAddress = StringUtils.isNoneEmpty(xforwaredIP) ? xforwaredIP : remoteIpAddress;
        ThreadContext.put(CLIENT_IP_ADDRESS, clientIpAddress);
        ThreadContext.put(REMOTE_OR_PROXY_IP_ADDRESS, remoteIpAddress);

        String userPrincipal = (SecurityUtils.getSubject() != null && SecurityUtils.getSubject().getPrincipal() != null)
                ? SecurityUtils.getSubject().getPrincipal().toString()
                : "n/a";
        ThreadContext.put(USER_PRINCIPAL, userPrincipal);

    }

    private static void destroyHttpMDC() {
        logger.trace("Destorying MDC");
        ThreadContext.remove(CLIENT_IP_ADDRESS);
        ThreadContext.remove(USER_PRINCIPAL);
        ThreadContext.remove(REMOTE_OR_PROXY_IP_ADDRESS);
    }

    /**
     * Can be used statically to wrap a log action into a MDC. This can be useful in
     * places where the {@link HttpDiagnostic} annotation can not be used, but a
     * http request object is accessible. Usage:
     * 
     * <pre>
     * <code>
     *  MDCFilter.wrapIntoMDC(
     *      () -> logger.info("my log message"),
     *      httpRequest
     *  )
     * </code>
     * </pre>
     * 
     * @param logAction
     * @param httpRequest
     */
    public static <T> void wrapIntoMDC(VoidAction logAction, HttpServletRequest httpRequest) {
        try {
            MDCFilter.setHttpMDC(httpRequest);
            logAction.action();
        } finally {
            MDCFilter.destroyHttpMDC();
        }
    }

    public interface VoidAction {
        void action();
    }

    @Override
    // implements ContainerRequestFilter to ease junit testing
    public void filter(ContainerRequestContext requestContext) throws IOException {
        setHttpMDC(httpRequest);
    }

}