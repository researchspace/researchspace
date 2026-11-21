/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.repository.sparql;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.apache.http.HttpConnection;
import org.apache.http.HttpConnectionMetrics;
import org.apache.http.HttpRequest;
import org.apache.http.NoHttpResponseException;
import org.apache.http.client.HttpRequestRetryHandler;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.protocol.HttpCoreContext;
import org.junit.Test;

/**
 * Pins the retry semantics of the shared HTTP client.
 *
 * All SPARQL UPDATE requests go over this client as POST; a POST that was
 * already fully sent must never be replayed, because the server may have
 * executed the update before the connection died — a replay would apply it
 * twice. Recovery from stale idle keep-alive connections is still expected
 * for idempotent GETs and for POSTs whose write never reached the server.
 */
public class MpRetryHandlerTest {

    private final HttpRequestRetryHandler handler = MpSharedHttpClientSessionManager.createRetryHandler();

    @Test
    public void doesNotReplayFullySentPost() {
        // The dangerous case: request fully sent (server may have executed a
        // SPARQL UPDATE), response lost. Must NOT retry.
        assertFalse(handler.retryRequest(new NoHttpResponseException("connection died after send"), 1,
                contextFor(new HttpPost("http://example.org/sparql"), true)));
    }

    @Test
    public void retriesPostThatWasNeverSent() {
        // Write failed before the request reached the server (server closed an
        // idle keep-alive): safe to retry even for POST.
        assertTrue(handler.retryRequest(new NoHttpResponseException("stale keep-alive"), 1,
                contextFor(new HttpPost("http://example.org/sparql"), false)));
    }

    @Test
    public void retriesIdempotentGet() {
        assertTrue(handler.retryRequest(new NoHttpResponseException("stale keep-alive"), 1,
                contextFor(new HttpGet("http://example.org/sparql?query=ASK%20%7B%7D"), true)));
    }

    private HttpClientContext contextFor(HttpRequest request, boolean requestSent) {
        HttpClientContext context = HttpClientContext.create();
        context.setAttribute(HttpCoreContext.HTTP_REQUEST, request);
        context.setAttribute(HttpCoreContext.HTTP_REQ_SENT, requestSent);
        // Simulate what the retry handler actually observes after an in-flight
        // failure: the pool proxy is detached and always reports stale.
        context.setAttribute(HttpCoreContext.HTTP_CONNECTION, new AlwaysStaleConnection());
        return context;
    }

    private static final class AlwaysStaleConnection implements HttpConnection {
        @Override
        public void close() {
        }

        @Override
        public boolean isOpen() {
            return true;
        }

        @Override
        public boolean isStale() {
            return true;
        }

        @Override
        public void setSocketTimeout(int timeout) {
        }

        @Override
        public int getSocketTimeout() {
            return 0;
        }

        @Override
        public void shutdown() {
        }

        @Override
        public HttpConnectionMetrics getMetrics() {
            return null;
        }
    }
}
