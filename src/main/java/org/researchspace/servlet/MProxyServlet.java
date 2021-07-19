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

package org.researchspace.servlet;

import java.io.IOException;
import java.net.ConnectException;
import java.util.Base64;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpRequest;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.HttpVersion;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.DefaultHttpResponseFactory;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.permission.WildcardPermission;
import org.mitre.dsmiley.httpproxy.ProxyServlet;
import org.researchspace.security.Permissions;

import com.google.inject.Inject;

/**
 * 
 * A proxy servlet for accessing a remote URL <b>targetUri</b> requiring
 * separate authentication. Transforms a request of the form [platform
 * URL]/proxy/[proxy ID]/path/to/resource into [targetUri]/path/to/resource and
 * adds the authentication header.
 * 
 * The <b>targetUri</b> and the login credentials are passed via properties in
 * two ways:
 * <ul>
 * <li>Using the file <i>config/proxy.prop</i>.</li>
 * <li>Using Java system properties.</li>
 * </ul>
 * The following properties are supported:
 * <ul>
 * <li><b>config.proxy.[proxy ID].targetUri</b>: the target URL to redirect the
 * requests to.</li>
 * </ul>
 * and two alternative options to pass the login credentials
 * <ul>
 * <li><b>config.proxy.[proxy ID].loginName</b> and</li>
 * <li><b>config.proxy.[proxy ID].loginPassword</b>: login and password for
 * basic authentication on the target web site.</li>
 * </ul>
 * OR
 * <ul>
 * <li><b>config.proxy.[proxy ID].loginBase64</b>: base64-encoded
 * "login:password" pair. This option is only applied when login and password
 * are not provided explicitly. Note: this option exists only to avoid defining
 * login and password in the configuration file as plain text, but does not
 * provide secure data interchange.</li>
 * </ul>
 *
 */
public class MProxyServlet extends ProxyServlet {
    private static final long serialVersionUID = 6066609865661758364L;

    private static final Logger logger = LogManager.getLogger(MProxyServlet.class);

    private final String key;

    @Inject
    public MProxyServlet(String key) {
        this.key = key;
    }

    // by default ProxyServlet is using request.pathInfo for path rewriting,
    // that by default decodes encoded characters, as a result it can happen that
    // proxy request is different from original request.
    // So we need to use getRequestURI for this purpose.
    // see https://github.com/mitre/HTTP-Proxy-Servlet/pull/158
    @Override
    protected String rewritePathInfoFromRequest(HttpServletRequest servletRequest) {
        String path = servletRequest.getContextPath().concat(servletRequest.getServletPath());
        return servletRequest.getRequestURI().substring(path.length());
    }

    // No need to encode uri.
    // We already use encoded requestURI in the rewritePathInfoFromRequest.
    @Override
    protected CharSequence encodeUriQuery(CharSequence in, boolean encodePercent) {
        return in;
    }

    @Override
    protected HttpResponse doExecute(HttpServletRequest servletRequest, HttpServletResponse servletResponse,
            HttpRequest proxyRequest) throws IOException {

        String loginName = getConfigParam("loginName");
        String loginPassword = getConfigParam("loginPassword");
        String loginBase64 = getConfigParam("loginBase64");
        String permission = Permissions.PROXY.PREFIX + key;
        String encodedAuth = null;

        this.setXForwardedFor(servletRequest, proxyRequest);

        if (!SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission))) {
            return createHttpError("You do not have required permissions to access this resource",
                    HttpStatus.SC_FORBIDDEN);
        }

        if (!StringUtils.isEmpty(loginName) && !StringUtils.isEmpty(loginPassword)) {
            encodedAuth = Base64.getEncoder().encodeToString((loginName + ":" + loginPassword).getBytes());
        } else {
            encodedAuth = loginBase64;
        }

        if (encodedAuth != null && encodedAuth != "") {
            proxyRequest.removeHeaders("Authorization"); // Sometimes this header is already set,
                                                         // but with invalid
                                                         // Authorizations. Remove just in case.
            proxyRequest.addHeader("Authorization", "Basic " + encodedAuth);
        }

        if (logger.isTraceEnabled()) {
            logger.trace("proxy " + servletRequest.getMethod() + " uri: " + servletRequest.getRequestURI() + " -- "
                    + proxyRequest.getRequestLine().getUri());
        }

        try {
            return getProxyClient().execute(getTargetHost(servletRequest), proxyRequest);
        } catch (ConnectException e) {
            logger.debug("Connection to target system could not be established: ", e);
            return createHttpError("Connection to target system could not be established: " + e.getMessage(),
                    HttpStatus.SC_INTERNAL_SERVER_ERROR);
        } catch (Throwable t) {
            logger.debug("Unexpected error while proxying request: ", t);
            return createHttpError("Internal error while proxying request: " + t.getMessage(),
                    HttpStatus.SC_INTERNAL_SERVER_ERROR);
        }
    }

    protected HttpResponse createHttpError(String message, int statusCode) throws IOException {
        HttpResponse response = new DefaultHttpResponseFactory().newHttpResponse(HttpVersion.HTTP_1_1, statusCode,
                null);
        response.setEntity(new StringEntity(message));
        return response;
    }

    private void setXForwardedFor(HttpServletRequest servletRequest, HttpRequest proxyRequest) {
        proxyRequest.addHeader("X-Forwarded-Path", "/proxy/" + this.key);
        proxyRequest.addHeader("X-Forwarded-Port", String.valueOf(servletRequest.getServerPort()));
        proxyRequest.addHeader("X-Forwarded-Proto", servletRequest.getScheme());
    }
}
