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

import java.net.URI;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;

/**
 * Servlet that is used by MProxyServlet to handle WebSocket protocol. It uses
 * jetty's built-in WebSocketClient to esteblish websocket connection with the
 * target server. And then simply forwards the messages between the client and
 * the target server.
 */
public class WebSocketProxyServlet extends WebSocketServlet {
    private static final Logger logger = LogManager.getLogger(WebSocketProxyServlet.class);
    private static final int MAX_MESSAGE_SIZE = 400000; // about 390 KB

    @Override
    public void configure(WebSocketServletFactory factory) {
        // Maximum message sizes the server can handle
        factory.getPolicy().setMaxTextMessageSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxBinaryMessageSize(MAX_MESSAGE_SIZE);

        // Standard buffer sizes for communication
        factory.getPolicy().setInputBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxTextMessageBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setMaxBinaryMessageBufferSize(MAX_MESSAGE_SIZE);
        factory.getPolicy().setIdleTimeout(600000); // 10 minutes in milliseconds

        factory.setCreator((req, resp) -> {
            // Retrieve the proxyRequestUri from the request attributes that are set in the
            // MProxyServlet
            String proxyRequestUri = (String) req.getHttpServletRequest().getAttribute("proxyRequestUri");

            // Convert the proxyRequestUri scheme from http(s) to ws(s)
            if (proxyRequestUri.startsWith("http://")) {
                proxyRequestUri = "ws://" + proxyRequestUri.substring(7);
            } else if (proxyRequestUri.startsWith("https://")) {
                proxyRequestUri = "wss://" + proxyRequestUri.substring(8);
            }

            WebSocketClient wsClient = new WebSocketClient();
            wsClient.getPolicy().setMaxTextMessageSize(MAX_MESSAGE_SIZE);
            wsClient.getPolicy().setMaxBinaryMessageSize(MAX_MESSAGE_SIZE);
            wsClient.getPolicy().setInputBufferSize(MAX_MESSAGE_SIZE);
            wsClient.getPolicy().setMaxTextMessageBufferSize(MAX_MESSAGE_SIZE);
            wsClient.getPolicy().setMaxBinaryMessageBufferSize(MAX_MESSAGE_SIZE);
            wsClient.getPolicy().setIdleTimeout(600000); // 10 minutes in milliseconds

            try {
                wsClient.start();
                logger.info("WebSocketClient started");
            } catch (Exception e) {
                logger.error("Failed to start WebSocketClient", e);
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
    public static class WsUpgradeHandler extends WebSocketAdapter implements WebSocketPartialListener {
        private static final Logger logger = LogManager.getLogger(WsUpgradeHandler.class);
        private final String targetUri;
        private final WebSocketClient wsClient;
        private Session clientSession;
        private Session targetSession;

        private StringBuilder accumulatedTextMessage = new StringBuilder();
        private ByteArrayOutputStream accumulatedBinaryMessage = new ByteArrayOutputStream();

        public WsUpgradeHandler(String targetUri, WebSocketClient wsClient) {
            this.targetUri = targetUri;
            this.wsClient = wsClient;
        }

        public void close() {
            try {
                if (wsClient != null) {
                    wsClient.stop();
                    logger.trace("WebSocketClient stopped");
                }
            } catch (Exception e) {
                logger.error("Error stopping WebSocketClient", e);
            }
        }
        

        @Override
        public void onWebSocketConnect(Session session) {
            super.onWebSocketConnect(session);
            this.clientSession = session;
            logger.info("Client connected: {}", session.getRemoteAddress());

            try {
                ClientUpgradeRequest request = new ClientUpgradeRequest();
                request.setHeader("Authorization",
                        "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcnRlbSIsInVzZXJuYW1lIjoiYXJ0ZW0iLCJyb2xlcyI6W3siYXV0aG9yaXR5IjoiYWRtaW5pc3RyYXRvciJ9LHsiYXV0aG9yaXR5IjoicmVndWxhciJ9LHsiYXV0aG9yaXR5IjoidXNlcl9tYW5hZ2VyIn1dLCJleHAiOjE3MjMyMzEwNjR9.zgLnmggXY3-ZeetfX1GdlA7xVdGsJ1jXhD-3ceCKnqqZc6T_BONs0yWHvPh_5iBgLuCKAikpOrZiqzI2PoMxpg");
                wsClient.connect(new TargetWebSocketAdapter(), new URI(targetUri), request);
                logger.info("Connecting to target: {}", targetUri);
            } catch (Exception e) {
                logger.error("Failed to connect to target WebSocket server: {}", targetUri, e);
                session.close(1011, "Failed to connect to target WebSocket server");
                throw new RuntimeException(e);
            }
        }

        @Override
        public void onWebSocketPartialText(String payload, boolean fin) {
            logger.info("Received partial text message from client, size: {}, fin: {}", payload.length(), fin);
            accumulatedTextMessage.append(payload);
            if (fin) {
                sendAccumulatedTextMessage();
            }
        }

        @Override
        public void onWebSocketText(String message) {
            logger.info("Received text message from client, size: {}", message.length());
            sendTextMessage(message);
        }

        @Override
        public void onWebSocketPartialBinary(ByteBuffer payload, boolean fin) {
            logger.info("Received partial binary message from client, size: {}, fin: {}", payload.remaining(), fin);
            byte[] bytes = new byte[payload.remaining()];
            payload.get(bytes);
            try {
                accumulatedBinaryMessage.write(bytes);
                if (fin) {
                    sendAccumulatedBinaryMessage();
                }
            } catch (IOException e) {
                onWebSocketError(e);
            }
        }

        @Override
        public void onWebSocketBinary(byte[] payload, int offset, int len) {
            logger.info("Received binary message from client, size: {}", len);
            sendBinaryMessage(payload, offset, len);
        }

        private void sendAccumulatedTextMessage() {
            String fullMessage = accumulatedTextMessage.toString();
            sendTextMessage(fullMessage);
            accumulatedTextMessage.setLength(0);
        }

        private void sendAccumulatedBinaryMessage() {
            byte[] fullMessage = accumulatedBinaryMessage.toByteArray();
            sendBinaryMessage(fullMessage, 0, fullMessage.length);
            accumulatedBinaryMessage.reset();
        }

        private void sendTextMessage(String message) {
            logger.info("Sending text message to target, size: {}", message.length());
            if (targetSession != null && targetSession.isOpen() && message.length() > 0) {
                try {
                    targetSession.getRemote().sendString(message);
                } catch (IOException e) {
                    onWebSocketError(e);
                }
            }
        }

        private void sendBinaryMessage(byte[] payload, int offset, int len) {
            logger.info("Sending binary message to target, size: {}", len);
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
            logger.info("Client initiated close: statusCode={}, reason={}", statusCode, reason);
            super.onWebSocketClose(statusCode, reason);
            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(statusCode, reason);
            }
            close();
        }

        @Override
        public void onWebSocketError(Throwable cause) {
            logger.error("WebSocket error in client connection", cause);
            cause.printStackTrace();
            super.onWebSocketError(cause);
            if (clientSession != null && clientSession.isOpen()) {
                clientSession.close(1011, "WebSocket error");
            }
            if (targetSession != null && targetSession.isOpen()) {
                targetSession.close(1011, "WebSocket error");
            }
            close();
            throw new RuntimeException(cause);
        }

        private class TargetWebSocketAdapter extends WebSocketAdapter implements WebSocketPartialListener {
            private final Logger logger = LogManager.getLogger(TargetWebSocketAdapter.class);
            private StringBuilder accumulatedTextMessage = new StringBuilder();
            private ByteArrayOutputStream accumulatedBinaryMessage = new ByteArrayOutputStream();

            @Override
            public void onWebSocketConnect(Session session) {
                super.onWebSocketConnect(session);
                targetSession = session;
                logger.info("Connected to target: {}", session.getRemoteAddress());
            }

            @Override
            public void onWebSocketPartialText(String payload, boolean fin) {
                logger.info("Received partial text message from target, size: {}, fin: {}", payload.length(), fin);
                accumulatedTextMessage.append(payload);
                if (fin) {
                    sendAccumulatedTextMessage();
                }
            }

            @Override
            public void onWebSocketText(String message) {
                logger.info("Received text message from target, size: {}", message.length());
                sendTextMessage(message);
            }

            @Override
            public void onWebSocketPartialBinary(ByteBuffer payload, boolean fin) {
                logger.info("Received partial binary message from target, size: {}, fin: {}", payload.remaining(), fin);
                byte[] bytes = new byte[payload.remaining()];
                payload.get(bytes);
                try {
                    accumulatedBinaryMessage.write(bytes);
                    if (fin) {
                        sendAccumulatedBinaryMessage();
                    }    
                } catch (IOException e) {
                    onWebSocketError(e);
                }
            }

            @Override
            public void onWebSocketBinary(byte[] payload, int offset, int len) {
                logger.info("Received binary message from target, size: {}", len);
                sendBinaryMessage(payload, offset, len);
            }

            private void sendAccumulatedTextMessage() {
                String fullMessage = accumulatedTextMessage.toString();
                sendTextMessage(fullMessage);
                accumulatedTextMessage.setLength(0);
            }

            private void sendAccumulatedBinaryMessage() {
                byte[] fullMessage = accumulatedBinaryMessage.toByteArray();
                sendBinaryMessage(fullMessage, 0, fullMessage.length);
                accumulatedBinaryMessage.reset();
            }

            private void sendTextMessage(String message) {
                logger.info("Sending text message to client, size: {}", message.length());
                if (clientSession != null && clientSession.isOpen() && message.length() > 0){
                    try {
                        clientSession.getRemote().sendString(message);
                    } catch (IOException e) {
                        onWebSocketError(e);
                    }
                }
            }

            private void sendBinaryMessage(byte[] payload, int offset, int len) {
                logger.info("Sending binary message to client, size: {}", len);
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
                logger.info("Target initiated close: statusCode={}, reason={}", statusCode, reason);
                super.onWebSocketClose(statusCode, reason);
                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(statusCode, reason);
                }
            }

            @Override
            public void onWebSocketError(Throwable cause) {
                logger.error("WebSocket error in target connection", cause);
                super.onWebSocketError(cause);
                if (clientSession != null && clientSession.isOpen()) {
                    clientSession.close(1011, "WebSocket error");
                }
            }
        }
    }
}
