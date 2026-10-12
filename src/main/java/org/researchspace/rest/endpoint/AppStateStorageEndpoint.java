/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.rest.endpoint;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.Permissions.SERVICES;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Stores and retrieves application states created by the {@code <app-state>}
 * component in backend storage mode. The page URL then only carries the id of
 * the stored state ({@code ?stateId=<uuid>}) instead of the encoded state.
 *
 * <ul>
 * <li>{@code POST /rest/app-state/save} requires {@link SERVICES#URL_MINIFY},
 * like creating a short link.</li>
 * <li>{@code GET /rest/app-state/load/{id}} requires no permission: the random
 * id works as a capability URL, in the same way as short links.</li>
 * <li>{@code DELETE /rest/app-state/delete/{id}} is allowed to the user who
 * created the state, or to users with {@link SERVICES#APP_STATE_DELETE_ANY}.</li>
 * </ul>
 */
@Path("app-state")
public class AppStateStorageEndpoint {
    private static final Logger logger = LogManager.getLogger(AppStateStorageEndpoint.class);

    static final StoragePath STATE_FOLDER = ObjectKind.CONFIG.resolve("app-states");
    private static final Pattern STATE_ID = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    private final PlatformStorage platformStorage;
    private final ObjectMapper mapper = JsonUtil.getDefaultObjectMapper();

    @Inject
    public AppStateStorageEndpoint(PlatformStorage platformStorage) {
        this.platformStorage = platformStorage;
    }

    @POST
    @Path("save")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response saveState(StateData stateData) {
        Subject subject = SecurityUtils.getSubject();
        if (!subject.isPermitted(SERVICES.URL_MINIFY)) {
            return error(Status.FORBIDDEN, "Permission denied");
        }
        if (stateData == null || stateData.states == null) {
            return error(Status.BAD_REQUEST, "Missing states");
        }

        StoredState stored = new StoredState();
        stored.id = UUID.randomUUID().toString();
        stored.createdAt = Instant.now().toString();
        stored.createdBy = getUserName(subject);
        stored.pageUrl = stateData.pageUrl;
        try {
            stored.states = normalizeStates(stateData.states);
        } catch (IOException e) {
            return error(Status.BAD_REQUEST, "States must be a JSON object");
        }

        try {
            byte[] bytes = mapper.writeValueAsBytes(stored);
            try (InputStream stream = new ByteArrayInputStream(bytes)) {
                getStorage().appendObject(statePath(stored.id), platformStorage.getDefaultMetadata(), stream,
                        bytes.length);
            }
            return Response.ok(Collections.singletonMap("stateId", stored.id)).build();
        } catch (IOException e) {
            logger.error("Failed to save application state", e);
            return error(Status.INTERNAL_SERVER_ERROR, "Failed to save application state");
        }
    }

    @GET
    @NoCache
    @Path("load/{stateId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadState(@PathParam("stateId") String stateId) {
        if (!isValidStateId(stateId)) {
            return error(Status.BAD_REQUEST, "Invalid state id");
        }
        try {
            Optional<StoredState> stored = readState(stateId);
            if (!stored.isPresent()) {
                return error(Status.NOT_FOUND, "State not found");
            }
            return Response.ok(stored.get()).build();
        } catch (IOException e) {
            logger.error("Failed to load application state " + stateId, e);
            return error(Status.INTERNAL_SERVER_ERROR, "Failed to load application state");
        }
    }

    @DELETE
    @Path("delete/{stateId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteState(@PathParam("stateId") String stateId) {
        if (!isValidStateId(stateId)) {
            return error(Status.BAD_REQUEST, "Invalid state id");
        }
        Subject subject = SecurityUtils.getSubject();
        try {
            Optional<StoredState> stored = readState(stateId);
            if (!stored.isPresent()) {
                return error(Status.NOT_FOUND, "State not found");
            }
            boolean isOwner = subject.isAuthenticated() && getUserName(subject).equals(stored.get().createdBy);
            if (!isOwner && !subject.isPermitted(SERVICES.APP_STATE_DELETE_ANY)) {
                return error(Status.FORBIDDEN, "Permission denied");
            }
            getStorage().deleteObject(statePath(stateId), platformStorage.getDefaultMetadata());
            return Response.ok(Collections.singletonMap("stateId", stateId)).build();
        } catch (IOException e) {
            logger.error("Failed to delete application state " + stateId, e);
            return error(Status.INTERNAL_SERVER_ERROR, "Failed to delete application state");
        }
    }

    private ObjectStorage getStorage() {
        return platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY);
    }

    private static StoragePath statePath(String stateId) {
        return STATE_FOLDER.resolve(stateId + ".json");
    }

    private Optional<StoredState> readState(String stateId) throws IOException {
        Optional<ObjectRecord> record = getStorage().getObject(statePath(stateId), null);
        if (!record.isPresent()) {
            return Optional.empty();
        }
        try (InputStream stream = record.get().getLocation().readContent()) {
            StoredState stored = mapper.readValue(stream, StoredState.class);
            // states saved by earlier versions are a JSON string instead of an object
            stored.states = normalizeStates(stored.states);
            return Optional.of(stored);
        }
    }

    /**
     * Accepts the states either as a JSON object or as a string containing a JSON
     * object, and always returns the object.
     */
    private JsonNode normalizeStates(JsonNode states) throws IOException {
        JsonNode result = states != null && states.isTextual() ? mapper.readTree(states.asText()) : states;
        if (result == null || !result.isObject()) {
            throw new IOException("States must be a JSON object");
        }
        return result;
    }

    private static String getUserName(Subject subject) {
        Object principal = subject.getPrincipal();
        return principal == null ? "" : principal.toString();
    }

    static boolean isValidStateId(String stateId) {
        return stateId != null && STATE_ID.matcher(stateId).matches();
    }

    private static Response error(Status status, String message) {
        Map<String, String> body = Collections.singletonMap("error", message);
        return Response.status(status).type(MediaType.APPLICATION_JSON).entity(body).build();
    }

    /**
     * Request body of {@code POST /rest/app-state/save}.
     */
    public static class StateData {
        public String pageUrl;
        /**
         * Component states keyed by component id. A string containing the JSON
         * object is accepted as well, for clients of earlier versions.
         */
        public JsonNode states;
    }

    /**
     * Stored state with its metadata, as returned by
     * {@code GET /rest/app-state/load/{id}}.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StoredState {
        public String id;
        public String createdAt;
        public String createdBy;
        public String pageUrl;
        public JsonNode states;
    }
}
