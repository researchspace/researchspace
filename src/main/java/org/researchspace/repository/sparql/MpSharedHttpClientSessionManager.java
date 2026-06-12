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

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.http.HttpConnection;
import org.apache.http.client.HttpRequestRetryHandler;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.protocol.HttpContext;
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
     * Closes stale pooled connections and retries the request. Servers and
     * load balancers close idle keep-alive connections; reusing one surfaces as
     * NoHttpResponseException ("failed to respond") even though the request was
     * never processed. Mirrors rdf4j's SharedHttpClientSessionManager.RetryHandlerStale,
     * which our custom HttpClientBuilder otherwise replaces - but allows a few
     * retries instead of one: after an endpoint restart the pool can hold
     * SEVERAL stale connections (one per previously concurrent request), and
     * each retry may lease the next stale one. Only stale connections are
     * retried, so genuine failures still propagate immediately.
     */
    private static class RetryHandlerStale implements HttpRequestRetryHandler {
        @Override
        public boolean retryRequest(IOException ioe, int count, HttpContext context) {
            if (count > 3) {
                return false;
            }
            HttpConnection conn = HttpClientContext.adapt(context).getConnection();
            if (conn != null) {
                synchronized (this) {
                    if (conn.isStale()) {
                        try {
                            logger.warn("Closing stale connection");
                            conn.close();
                            return true;
                        } catch (IOException e) {
                            logger.error("Error closing stale connection", e);
                        }
                    }
                }
            }
            return false;
        }
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

        // Remote endpoints and load balancers close idle keep-alive connections;
        // without revalidation a pooled connection that died while idle surfaces
        // as NoHttpResponseException ("failed to respond") on the next query.
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(maxConnections);
        connectionManager.setDefaultMaxPerRoute(maxConnections);
        connectionManager.setValidateAfterInactivity(1000);

        // Note: deliberately no evictExpiredConnections()/evictIdleConnections() —
        // those spawn an IdleConnectionEvictor background thread that outlives
        // webapp reloads (the servlet container kills the classloader, the thread
        // then dies with NoClassDefFoundError). Connection staleness is fully
        // handled by validateAfterInactivity + RetryHandlerStale above.
        HttpClientBuilder mpHttpClientBuilder = HttpClientBuilder.create()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .setUserAgent(userAgent)
                .setRetryHandler(new RetryHandlerStale());

        // Force POST for SPARQL queries to avoid HTTP 431 errors from servers
        // with low header size limits. SPARQLProtocolSession reads this system property.
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
