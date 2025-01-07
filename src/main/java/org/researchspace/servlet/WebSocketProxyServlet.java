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
import org.eclipse.jetty.websocket.api.WebSocketPartialListener;
import org.eclipse.jetty.websocket.client.ClientUpgradeRequest;
import org.eclipse.jetty.websocket.client.WebSocketClient;
import org.eclipse.jetty.websocket.servlet.WebSocketServlet;
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.servlet.ServletException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Servlet that is used by MProxyServlet to handle WebSocket protocol.
 * It uses Jetty's built-in WebSocketClient to establish a WebSocket
 * connection with the target server. It forwards messages between
 * the client and the target server.
 */
public class WebSocketProxyServlet extends WebSocketServlet {
    private static final Logger logger = LogManager.getLogger(WebSocketProxyServlet.class);
    private static final int MAX_MESSAGE_SIZE = 400_000; // Approximately 390 KB
    private static final long IDLE_TIMEOUT = 600_000;    // 10 minutes in milliseconds
    private static final int MAX_ACCUMULATED_MESSAGE_SIZE = 4 * 1024 * 1024; // 4 MB

    private WebSocketClient wsClient;

    @Override
    public void init() throws ServletException {
        super.init();
        wsClient = new WebSocketClient();
        wsClient.getPolicy().setMaxTextMessageSize(MAX_MESSAGE_SIZE);
        wsClient.getPolicy().setMaxBinaryMessageSize(MAX_MESSAGE_SIZE);
        wsClient.getPolicy().setInputBufferSize(MAX_MESSAGE_SIZE);
        wsClient.getPolicy().setMaxTextMessageBufferSize(MAX_MESSAGE_SIZE);
        wsClient.getPolicy().setMaxBinaryMessageBufferSize(MAX_MESSAGE_SIZE);
        wsClient.getPolicy().setIdleTimeout(IDLE_TIMEOUT);

        try {
            wsClient.start();
            logger.info("WebSocketClient started");
        } catch (Exception e) {
            logger.error("Failed to start WebSocketClient", e);
            throw new ServletException("Failed to start WebSocketClient", e);
        }
    }

    @Override
    public void destroy() {
        try {
            if (wsClient != null) {
                wsClient.stop();
                logger.info("WebSocketClient stopped");
            }
        } catch (Exception e) {
            logger.error("Error stopping WebSocketClient", e);
        }
        super.destroy();
    }

    @Override
    public void configure(WebSocketServletFactory factory) {
        // Set maximum message sizes the server can handle
        factory.getPolicy().setMaxTextMessageSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxBinaryMessageSize(MAX_MESSAGE_SIZE);

        // Set buffer sizes for communication
        factory.getPolicy().setInputBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxTextMessageBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxBinaryMessageBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setIdleTimeout(IDLE_TIMEOUT);

        factory.setCreator((req, resp) -> {
            // Retrieve the proxyRequestUri from the request attributes set by MProxyServlet
            String proxyRequestUri = (String) req.getHttpServletRequest().getAttribute("proxyRequestUri");

            // Convert the proxyRequestUri scheme from http(s) to ws(s)
            if (proxyRequestUri.startsWith("http://")) {
                proxyRequestUri = "ws://" + proxyRequestUri.substring(7);
            } else if (proxyRequestUri.startsWith("https://")) {
                proxyRequestUri = "wss://" + proxyRequestUri.substring(8);
            }

            return new WsUpgradeHandler(proxyRequestUri);
        });
    }

    /**
     * WsUpgradeHandler handles messages sent from the client and propagates them to
     * the target server. TargetWebSocketAdapter handles messages sent from the
     * target server and propagates them to the client.
     */
    public class WsUpgradeHandler extends WebSocketAdapter implements WebSocketPartialListener {
        private final Logger logger = LogManager.getLogger(WsUpgradeHandler.class);
        private final String targetUri;
        private Session clientSession;
        private Session targetSession;

        private StringBuilder accumulatedTextMessage = new StringBuilder();
        private ByteArrayOutputStream accumulatedBinaryMessage = new ByteArrayOutputStream();

        public WsUpgradeHandler(String targetUri) {
            this.targetUri = targetUri;
        }

        @Override
        public void onWebSocketConnect(Session session) {
            super.onWebSocketConnect(session);
            this.clientSession = session;
            logger.debug("Client connected: {}", session.getRemoteAddress());

            try {
                ClientUpgradeRequest request = new ClientUpgradeRequest();
                // Set additional headers if needed
                // request.setHeader("Authorization", "Bearer your_token_here");

                wsClient.connect(new TargetWebSocketAdapter(), new URI(targetUri), request);
                logger.debug("Connecting to target WebSocket server: {}", targetUri);
            } catch (Exception e) {
                logger.error("Failed to connect to target WebSocket server: {}", targetUri, e);
                session.close(1011, "Failed to connect to target WebSocket server");
            }
        }

        @Override
        public void onWebSocketPartialText(String payload, boolean fin) {
            accumulatedTextMessage.append(payload);

            if (accumulatedTextMessage.length() > MAX_ACCUMULATED_MESSAGE_SIZE) {
                logger.error("Accumulated text message size exceeds limit. Closing connection.");
                clientSession.close(1009, "Message too large");
                return;
            }

            if (fin) {
                sendAccumulatedTextMessage();
            }
        }

        @Override
        public void onWebSocketText(String message) {
            sendTextMessageToTarget(message);
        }

        @Override
        public void onWebSocketPartialBinary(ByteBuffer payload, boolean fin) {
            byte[] bytes = new byte[payload.remaining()];
            payload.get(bytes);

            try {
                accumulatedBinaryMessage.write(bytes);

                if (accumulatedBinaryMessage.size() > MAX_ACCUMULATED_MESSAGE_SIZE) {
                    logger.error("Accumulated binary message size exceeds limit. Closing connection.");
                    clientSession.close(1009, "Message too large");
                    return;
                }

                if (fin) {
                    sendAccumulatedBinaryMessage();
                }
            } catch (IOException e) {
                logger.error("Error accumulating binary message", e);
                clientSession.close(1011, "Internal error");
            }
        }

        @Override
        public void onWebSocketBinary(byte[] payload, int offset, int len) {
            sendBinaryMessageToTarget(payload, offset, len);
        }

        private void sendAccumulatedTextMessage() {
            String fullMessage = accumulatedTextMessage.toString();
            sendTextMessageToTarget(fullMessage);
            accumulatedTextMessage.setLength(0);
        }

        private void sendAccumulatedBinaryMessage() {
            byte[] fullMessage = accumulatedBinaryMessage.toByteArray();
            sendBinaryMessageToTarget(fullMessage, 0, fullMessage.length);
            accumulatedBinaryMessage.reset();
        }

        private void sendTextMessageToTarget(String message) {
            if (targetSession != null && targetSession.isOpen()) {
                try {
                    targetSession.getRemote().sendString(message);
                } catch (IOException e) {
                    logger.error("Error sending text message to target", e);
                    clientSession.close(1011, "Error forwarding message");
                }
            }
        }

        private void sendBinaryMessageToTarget(byte[] payload, int offset, int len) {
            if (targetSession != null && targetSession.isOpen()) {
                try {
                    targetSession.getRemote().sendBytes(ByteBuffer.wrap(payload, offset, len));
                } catch (IOException e) {
                    logger.error("Error sending binary message to target", e);
                    clientSession.close(1011, "Error forwarding message");
                }
            }
        }

        @Override
        public void onWebSocketClose(int statusCode, String reason) {
            logger.debug("Client initiated close: statusCode={}, reason={}", statusCode, reason);
            super.onWebSocketClose(statusCode, reason);

            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(statusCode, reason);
            }
        }

        @Override
        public void onWebSocketError(Throwable cause) {
            logger.error("WebSocket error in client connection", cause);

            if (clientSession != null && clientSession.isOpen()) {
                clientSession.close(1011, "WebSocket error");
            }
            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(1011, "WebSocket error");
            }
        }

        private class TargetWebSocketAdapter extends WebSocketAdapter implements WebSocketPartialListener {
            private final Logger logger = LogManager.getLogger(TargetWebSocketAdapter.class);
            private StringBuilder accumulatedTextMessage = new StringBuilder();
            private ByteArrayOutputStream accumulatedBinaryMessage = new ByteArrayOutputStream();

            @Override
            public void onWebSocketConnect(Session session) {
                super.onWebSocketConnect(session);
                targetSession = session;
                logger.debug("Connected to target WebSocket server: {}", session.getRemoteAddress());
            }

            @Override
            public void onWebSocketPartialText(String payload, boolean fin) {
                accumulatedTextMessage.append(payload);

                if (accumulatedTextMessage.length() > MAX_ACCUMULATED_MESSAGE_SIZE) {
                    logger.error("Accumulated text message size exceeds limit. Closing connection.");
                    targetSession.close(1009, "Message too large");
                    return;
                }

                if (fin) {
                    sendAccumulatedTextMessage();
                }
            }

            @Override
            public void onWebSocketText(String message) {
                sendTextMessageToClient(message);
            }

            @Override
            public void onWebSocketPartialBinary(ByteBuffer payload, boolean fin) {
                byte[] bytes = new byte[payload.remaining()];
                payload.get(bytes);

                try {
                    accumulatedBinaryMessage.write(bytes);

                    if (accumulatedBinaryMessage.size() > MAX_ACCUMULATED_MESSAGE_SIZE) {
                        logger.error("Accumulated binary message size exceeds limit. Closing connection.");
                        targetSession.close(1009, "Message too large");
                        return;
                    }

                    if (fin) {
                        sendAccumulatedBinaryMessage();
                    }
                } catch (IOException e) {
                    logger.error("Error accumulating binary message", e);
                    targetSession.close(1011, "Internal error");
                }
            }

            @Override
            public void onWebSocketBinary(byte[] payload, int offset, int len) {
                sendBinaryMessageToClient(payload, offset, len);
            }

            private void sendAccumulatedTextMessage() {
                String fullMessage = accumulatedTextMessage.toString();
                sendTextMessageToClient(fullMessage);
                accumulatedTextMessage.setLength(0);
            }

            private void sendAccumulatedBinaryMessage() {
                byte[] fullMessage = accumulatedBinaryMessage.toByteArray();
                sendBinaryMessageToClient(fullMessage, 0, fullMessage.length);
                accumulatedBinaryMessage.reset();
            }

            private void sendTextMessageToClient(String message) {
                if (clientSession != null && clientSession.isOpen()) {
                    try {
                        clientSession.getRemote().sendString(message);
                    } catch (IOException e) {
                        logger.error("Error sending text message to client", e);
                        targetSession.close(1011, "Error forwarding message");
                    }
                }
            }

            private void sendBinaryMessageToClient(byte[] payload, int offset, int len) {
                if (clientSession != null && clientSession.isOpen()) {
                    try {
                        clientSession.getRemote().sendBytes(ByteBuffer.wrap(payload, offset, len));
                    } catch (IOException e) {
                        logger.error("Error sending binary message to client", e);
                        targetSession.close(1011, "Error forwarding message");
                    }
                }
            }

            @Override
            public void onWebSocketClose(int statusCode, String reason) {
                logger.debug("Target initiated close: statusCode={}, reason={}", statusCode, reason);
                super.onWebSocketClose(statusCode, reason);

                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(statusCode, reason);
                }
            }

            @Override
            public void onWebSocketError(Throwable cause) {
                logger.error("WebSocket error in target connection", cause);

                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(1011, "WebSocket error");
                }
                if (targetSession != null && targetSession.isOpen()) {
                    targetSession.close(1011, "WebSocket error");
                }
            }
        }
    }
}
