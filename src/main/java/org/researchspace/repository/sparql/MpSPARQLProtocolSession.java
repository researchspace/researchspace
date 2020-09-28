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

package org.researchspace.repository.sparql;

import java.util.concurrent.ExecutorService;
import java.util.function.Function;

import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.AuthCache;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.auth.DigestScheme;
import org.apache.http.impl.client.BasicAuthCache;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.http.client.SPARQLProtocolSession;
import org.eclipse.rdf4j.query.Binding;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryLanguage;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @see SPARQLAuthenticatingRepository
 * @see SPARQLDigestAuthRepositoryFactory
 * @see StardogWrapperRepository
 */
public class MpSPARQLProtocolSession extends SPARQLProtocolSession {
    private static final Logger logger = LogManager.getLogger(MpSPARQLProtocolSession.class);

    /**
     * If set, the function is used to modify the HTTP request as part of
     * {@link #getQueryMethod(QueryLanguage, String, String, Dataset, boolean, int, Binding...)}.
     * 
     * <p>
     * Can be used for instance to add custom HTTP headers per query request.
     * </p>
     * <p>
     * Note that typically the passed {@link HttpUriRequest} is modified and
     * returned.
     * </p>
     */
    protected Function<HttpUriRequest, HttpUriRequest> httpRequestModifyFunction = null;

    public MpSPARQLProtocolSession(HttpClient client, ExecutorService executor) {
        super(client, executor);
    }

    public void setBasicAuthCredentials(String username, String password) {
        super.setUsernameAndPassword(username, password);
    }

    public void setDigestAuthCredentials(String username, String password, String realm) {
        logger.debug("Setting username '{}', realm '{}' and password for digest auth connection to server at {}.",
                username, realm, getQueryURL());
        java.net.URI requestURI = java.net.URI.create(getQueryURL());
        String host = requestURI.getHost();
        int port = requestURI.getPort();
        AuthScope scope = new AuthScope(host, port);
        final CredentialsProvider credsProvider = new BasicCredentialsProvider();
        credsProvider.setCredentials(scope, new UsernamePasswordCredentials(username, password));

        final AuthCache authCache = new BasicAuthCache();
        DigestScheme digestAuth = new DigestScheme();

        digestAuth.overrideParamter("realm", realm);
        digestAuth.overrideParamter("nonce", "researchspace-nonce");
        HttpHost httpHost = new HttpHost(requestURI.getHost(), requestURI.getPort(), requestURI.getScheme());
        authCache.put(httpHost, digestAuth);

        // Add AuthCache to the execution context
        ((HttpClientContext) getHttpContext()).setCredentialsProvider(credsProvider);
        ((HttpClientContext) getHttpContext()).setAuthCache(authCache);
    }

    /**
     * Optionally set a function to modify the HTTP request representing a query or
     * update.
     * <p>
     * Example:
     * </p>
     * 
     * <pre>
     * sp.setRequestModifier(request -> {
     *     request.addHeader("SD-Run-As", userId);
     *     return request;
     * });
     * </pre>
     * 
     * <p>
     * Note that the function should typically return the (modified) passed
     * {@link HttpUriRequest} object.
     * </p>
     * 
     * @param requestModifier
     */
    public void setRequestModifier(Function<HttpUriRequest, HttpUriRequest> requestModifier) {
        this.httpRequestModifyFunction = requestModifier;
    }

    @Override
    protected void setQueryURL(String queryURL) {
        super.setQueryURL(queryURL);
    }

    @Override
    protected void setUpdateURL(String updateURL) {
        super.setUpdateURL(updateURL);
    }

    @Override
    protected HttpUriRequest getQueryMethod(QueryLanguage ql, String query, String baseURI, Dataset dataset,
            boolean includeInferred, int maxQueryTime, Binding... bindings) {
        HttpUriRequest request = super.getQueryMethod(ql, query, baseURI, dataset, includeInferred, maxQueryTime,
                bindings);

        // if configured, modify the HTTP request (e.g. add custom headers per request)
        if (this.httpRequestModifyFunction != null) {
            request = this.httpRequestModifyFunction.apply(request);
        }

        return request;
    }
}
