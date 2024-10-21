/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
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

import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketAdapter;
import org.eclipse.jetty.websocket.client.ClientUpgradeRequest;
import org.eclipse.jetty.websocket.client.WebSocketClient;
import org.eclipse.jetty.websocket.servlet.WebSocketServlet;
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory;
import java.net.URI;
import java.io.IOException;
import java.nio.ByteBuffer;

/**
 * Servlet that is used by MProxyServlet to handle WebSocket protocol.
 * It uses jetty's built-in WebSocketClient to esteblish websocket connection with the target server.
 * And then simply forwards the messages between the client and the target server. 
 */
public class WebSocketProxyServlet extends WebSocketServlet {
    @Override
    public void configure(WebSocketServletFactory factory) {
        factory.setCreator((req, resp) -> {
            // Retrieve the proxyRequestUri from the request attributes that are set in the MProxyServlet
            String proxyRequestUri = (String) req.getHttpServletRequest().getAttribute("proxyRequestUri");

            // Convert the proxyRequestUri scheme from http(s) to ws(s)
            if (proxyRequestUri.startsWith("http://")) {
                proxyRequestUri = "ws://" + proxyRequestUri.substring(7);
            } else if (proxyRequestUri.startsWith("https://")) {
                proxyRequestUri = "wss://" + proxyRequestUri.substring(8);
            }

            WebSocketClient wsClient = new WebSocketClient();
            try {
                wsClient.start();
            } catch (Exception e) {
                throw new RuntimeException("Failed to start WebSocketClient", e);
            }

            return new WsUpgradeHandler(proxyRequestUri, wsClient);
        });
    }

    /**
     * WSUpgradeHandler handles messages sent from the client and propagates them to
     * the target server. TargetWebSocketAdapter handles messages sent from the
     * target server and propagates them to the client.
     */
    public static class WsUpgradeHandler extends WebSocketAdapter {
        private final String targetUri;
        private final WebSocketClient wsClient;
        private Session clientSession;
        private Session targetSession;

        public WsUpgradeHandler(String targetUri, WebSocketClient wsClient) {
            this.targetUri = targetUri;
            this.wsClient = wsClient;
        }

        @Override
        public void onWebSocketConnect(Session session) {
            super.onWebSocketConnect(session);
            this.clientSession = session;

            try {
                wsClient.connect(new TargetWebSocketAdapter(), new URI(targetUri), new ClientUpgradeRequest());
            } catch (Exception e) {
                session.close(1011, "Failed to connect to target WebSocket server");
                throw new RuntimeException(e);
            }
        }

        @Override
        public void onWebSocketText(String message) {
            if (targetSession != null && targetSession.isOpen()) {
                try {
                    targetSession.getRemote().sendString(message);
                } catch (IOException e) {
                    onWebSocketError(e);
                }
            }
        }

        @Override
        public void onWebSocketBinary(byte[] payload, int offset, int len) {
            if (targetSession != null && targetSession.isOpen()) {
                try {
                    targetSession.getRemote().sendBytes(ByteBuffer.wrap(payload, offset, len));
                } catch (IOException e) {
                    onWebSocketError(e);
                }
            }
        }

        @Override
        public void onWebSocketClose(int statusCode, String reason) {
            super.onWebSocketClose(statusCode, reason);
            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(statusCode, reason);
            }
        }

        @Override
        public void onWebSocketError(Throwable cause) {
            super.onWebSocketError(cause);
            if (clientSession != null && clientSession.isOpen()) {
                clientSession.close(1011, "WebSocket error");
            }
            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(1011, "WebSocket error");
            }
            throw new RuntimeException(cause);
        }

        private class TargetWebSocketAdapter extends WebSocketAdapter {
            @Override
            public void onWebSocketConnect(Session session) {
                super.onWebSocketConnect(session);
                targetSession = session;
            }

            @Override
            public void onWebSocketText(String message) {
                if (clientSession != null && clientSession.isOpen()) {
                    try {
                        clientSession.getRemote().sendString(message);
                    } catch (IOException e) {
                        onWebSocketError(e);
                    }
                }
            }

            @Override
            public void onWebSocketBinary(byte[] payload, int offset, int len) {
                if (clientSession != null && clientSession.isOpen()) {
                    try {
                        clientSession.getRemote().sendBytes(ByteBuffer.wrap(payload, offset, len));
                    } catch (IOException e) {
                        onWebSocketError(e);
                    }
                }
            }

            @Override
            public void onWebSocketClose(int statusCode, String reason) {
                super.onWebSocketClose(statusCode, reason);
                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(statusCode, reason);
                }
            }

            @Override
            public void onWebSocketError(Throwable cause) {
                super.onWebSocketError(cause);
                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(1011, "WebSocket error");
                }
                if (targetSession != null && targetSession.isOpen()) {
                    targetSession.close(1011, "WebSocket error");
                }

                throw new RuntimeException(cause);
            }
        }
    }
}