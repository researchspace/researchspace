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
import java.util.concurrent.Executors;

import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.HttpRequestRetryHandler;
import org.apache.http.impl.client.DefaultHttpRequestRetryHandler;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.http.client.SharedHttpClientSessionManager;
import org.researchspace.config.Configuration;

import com.google.common.util.concurrent.ThreadFactoryBuilder;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MpSharedHttpClientSessionManager extends SharedHttpClientSessionManager {

    private static final Logger logger = LogManager.getLogger(MpSharedHttpClientSessionManager.class);

    /**
     * Retry policy for the shared HTTP client. Package-private for tests.
     *
     * <p>Short SPARQL queries are sent as GET (see
     * {@code EnvironmentConfiguration#getSparqlMaxUrlLength}); GET is
     * idempotent, so the {@link DefaultHttpRequestRetryHandler} transparently
     * retries one that hit a keep-alive connection the server had closed while
     * idle. A POST whose write never reached the server is retried by the
     * default handler as well. A POST that was already fully sent is never
     * replayed: all SPARQL UPDATE requests go over this client as POST, and
     * the server may have executed the update before the connection died — a
     * replay would apply it twice.</p>
     */
    static HttpRequestRetryHandler createRetryHandler() {
        return new DefaultHttpRequestRetryHandler();
    }

    private final ExecutorService executor;
    private final Configuration config;

    public MpSharedHttpClientSessionManager(Configuration config) {
        this.config = config;
        this.executor = Executors
                .newCachedThreadPool(new ThreadFactoryBuilder().setNameFormat("rdf4j-sesameclientimpl-%d").build());
        Integer maxConnections = this.config.getEnvironmentConfig().getMaxSparqlHttpConnections();
        Integer connectionTimeout = this.config.getEnvironmentConfig().getSparqlHttpConnectionTimeout();

        RequestConfig.Builder configBuilder = RequestConfig.custom();
        if (connectionTimeout != null) {
            configBuilder = configBuilder.setConnectTimeout(connectionTimeout * 1000);
            configBuilder = configBuilder.setSocketTimeout(connectionTimeout * 1000);
        }
        configBuilder.setCookieSpec(CookieSpecs.STANDARD);

        RequestConfig requestConfig = configBuilder.build();
        String userAgent = this.config.getEnvironmentConfig().getHttpUserAgent();

        HttpClientBuilder mpHttpClientBuilder = HttpClientBuilder.create()
                .setMaxConnPerRoute(maxConnections)
                .setMaxConnTotal(maxConnections)
                .setDefaultRequestConfig(requestConfig)
                .setUserAgent(userAgent)
                .setRetryHandler(createRetryHandler());

        // Short SPARQL queries go as GET (idempotent, so a connection the server
        // closed while idle is retried transparently); only long queries - which
        // risk HTTP 431 from servers with small header limits - go as POST.
        // SPARQLProtocolSession reads this system property; see
        // EnvironmentConfiguration#getSparqlMaxUrlLength.
        Integer maxUrlLength = this.config.getEnvironmentConfig().getSparqlMaxUrlLength();
        System.setProperty("rdf4j.sparql.url.maxlength", String.valueOf(maxUrlLength));

        this.setHttpClientBuilder(mpHttpClientBuilder);
    }

    @Override
    public MpSPARQLProtocolSession createSPARQLProtocolSession(String queryEndpointUrl, String updateEndpointUrl) {
        MpSPARQLProtocolSession session = new MpSPARQLProtocolSession(getHttpClient(), executor);
        session.setQueryURL(queryEndpointUrl);
        session.setUpdateURL(updateEndpointUrl);
        return session;
    }

    @Override
    public void shutDown() {
        // closes the HTTP client (and with it the connection pool)
        super.shutDown();
        // the background executor threads are non-daemon and would otherwise
        // survive webapp reloads
        executor.shutdownNow();
    }
}
