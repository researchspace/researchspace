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

package org.researchspace.rest.endpoint;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.researchspace.security.WildcardPermission;
import org.researchspace.security.Permissions;
import org.researchspace.services.storage.api.*;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * REST endpoint for storing and retrieving application states.
 * This allows components to save their state to the backend and generate
 * shareable URLs that reference the stored state rather than encoding
 * everything in URL parameters.
 */
@Path("app-state")
public class AppStateStorageEndpoint {
    private static final Logger logger = LogManager.getLogger(AppStateStorageEndpoint.class);
    
    private static final String STORAGE_ID = "runtime";
    private static final String STATE_FOLDER = "app-states";
    
    private final PlatformStorage platformStorage;

    @Inject
    public AppStateStorageEndpoint(PlatformStorage platformStorage) {
        this.platformStorage = platformStorage;
    }

    /**
     * Store application state and return a unique ID
     */
    @POST
    @Path("save")
    @RequiresAuthentication
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response saveState(StateData stateData) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to save application state");
        }

        // Use URL_MINIFY permission since app states are similar to URL bookmarking
        // This is typically available to regular authenticated users
        assertPermission(Permissions.SERVICES.URL_MINIFY);

        try {
            // Generate unique ID for this state
            String stateId = UUID.randomUUID().toString();
            
            // Add metadata
            StateWrapper wrapper = new StateWrapper();
            wrapper.id = stateId;
            wrapper.createdAt = Instant.now().toString();
            wrapper.createdBy = SecurityUtils.getSubject().getPrincipal().toString();
            wrapper.pageUrl = stateData.pageUrl;
            wrapper.states = stateData.states;
            
            // Convert to JSON
            String json = toJson(wrapper);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            
            // Store in platform storage
            ObjectStorage storage = platformStorage.getStorage(STORAGE_ID);
            StoragePath path = ObjectKind.CONFIG.resolve(STATE_FOLDER).resolve(stateId + ".json");
            
            try (InputStream stream = new ByteArrayInputStream(bytes)) {
                storage.appendObject(path, platformStorage.getDefaultMetadata(), stream, bytes.length);
            }
            
            // Return the state ID
            return Response.ok()
                .entity("{\"stateId\": \"" + stateId + "\"}")
                .build();
                
        } catch (Exception e) {
            logger.error("Failed to save application state: " + e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError()
                .entity("{\"error\": \"" + e.getMessage() + "\"}")
                .build();
        }
    }

    /**
     * Retrieve application state by ID
     */
    @GET
    @Path("load/{stateId}")
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadState(@PathParam("stateId") String stateId) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to load application state: " + stateId);
        }

        // Use URL_MINIFY permission for reading states (same as save)
        assertPermission(Permissions.SERVICES.URL_MINIFY);

        try {
            // Validate state ID format
            if (!isValidStateId(stateId)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Invalid state ID format\"}")
                    .build();
            }
            
            // Load from storage
            ObjectStorage storage = platformStorage.getStorage(STORAGE_ID);
            StoragePath path = ObjectKind.CONFIG.resolve(STATE_FOLDER).resolve(stateId + ".json");
            
            Optional<ObjectRecord> record = storage.getObject(path, null);
            if (!record.isPresent()) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\": \"State not found\"}")
                    .build();
            }
            
            // Read content
            String json;
            try (InputStream stream = record.get().getLocation().readContent()) {
                json = IOUtils.toString(stream, StandardCharsets.UTF_8);
            }
            
            return Response.ok(json).build();
            
        } catch (Exception e) {
            logger.error("Failed to load application state: " + e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError()
                .entity("{\"error\": \"" + e.getMessage() + "\"}")
                .build();
        }
    }

    /**
     * Delete application state by ID (optional, for cleanup)
     */
    @DELETE
    @Path("delete/{stateId}")
    @RequiresAuthentication
    public Response deleteState(@PathParam("stateId") String stateId) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to delete application state: " + stateId);
        }

        // Use URL_MINIFY permission for deleting states (same as save)
        assertPermission(Permissions.SERVICES.URL_MINIFY);

        try {
            // Validate state ID format
            if (!isValidStateId(stateId)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\": \"Invalid state ID format\"}")
                    .build();
            }
            
            // Delete from storage
            ObjectStorage storage = platformStorage.getStorage(STORAGE_ID);
            StoragePath path = ObjectKind.CONFIG.resolve(STATE_FOLDER).resolve(stateId + ".json");
            
            storage.deleteObject(path, platformStorage.getDefaultMetadata());
            
            return Response.ok()
                .entity("{\"message\": \"State deleted successfully\"}")
                .build();
                
        } catch (Exception e) {
            logger.error("Failed to delete application state: " + e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError()
                .entity("{\"error\": \"" + e.getMessage() + "\"}")
                .build();
        }
    }

    private void assertPermission(String permission) {
        if (!SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission))) {
            ForbiddenException e = new ForbiddenException("Permission denied");
            logger.error("Denied permission \"" + permission + "\":", e);
            throw new WebApplicationException(e.getMessage(), Response.Status.FORBIDDEN);
        }
    }
    
    private boolean isValidStateId(String stateId) {
        // UUID format validation
        try {
            UUID.fromString(stateId);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
    
    private String toJson(StateWrapper wrapper) {
        // Simple JSON serialization (in production, use Jackson or similar)
        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"id\":\"").append(wrapper.id).append("\",");
        json.append("\"createdAt\":\"").append(wrapper.createdAt).append("\",");
        json.append("\"createdBy\":\"").append(wrapper.createdBy).append("\",");
        json.append("\"pageUrl\":\"").append(escapeJson(wrapper.pageUrl)).append("\",");
        json.append("\"states\":").append(wrapper.states);
        json.append("}");
        return json.toString();
    }
    
    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
    
    /**
     * Input data structure for saving state
     */
    public static class StateData {
        public String pageUrl;
        public String states; // JSON string of component states
    }
    
    /**
     * Internal wrapper for stored state with metadata
     */
    private static class StateWrapper {
        public String id;
        public String createdAt;
        public String createdBy;
        public String pageUrl;
        public String states;
    }
}
