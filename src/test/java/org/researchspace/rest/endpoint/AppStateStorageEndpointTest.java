/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.rest.endpoint;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import javax.inject.Inject;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.junit.JerseyTest;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.junit.ResearchSpaceShiroRule;
import org.researchspace.rest.providers.JacksonObjectMapperProvider;
import org.researchspace.services.storage.api.StoragePath;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.sdorra.shiro.SubjectAware;

public class AppStateStorageEndpointTest extends JerseyTest {
    private static final String SHIRO_FILE = "classpath:org/researchspace/rest/endpoint/shiro-app-state.ini";
    private static final String STATE_ID = "0b6c9a4e-2f4d-4a9e-9c55-3a8f6c2d1e70";

    private final ObjectMapper mapper = JsonUtil.getDefaultObjectMapper();

    @Inject
    public Configuration configuration;

    @Inject
    private CacheManager cacheManager;

    @Inject
    @Rule
    public PlatformStorageRule platformStorageRule;

    @Rule
    public ResearchSpaceShiroRule rule = new ResearchSpaceShiroRule(() -> configuration)
            .withCacheManager(() -> cacheManager);

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(AppStateStorageEndpoint.class);
        resourceConfig.register(JacksonFeature.class);
        resourceConfig.register(JacksonObjectMapperProvider.class);
    }

    @Test
    @SubjectAware(username = "alice", password = "alice", configuration = SHIRO_FILE)
    public void testSaveAndLoadRoundTrip() throws Exception {
        String pageUrl = "/resource/:test?a=\"b\"&c=\\d\n";
        String label = "quote \" backslash \\ control \u0001 accent à";
        String body = "{\"pageUrl\":" + mapper.writeValueAsString(pageUrl)
                + ",\"states\":{\"map\":{\"zoom\":3,\"label\":" + mapper.writeValueAsString(label) + "}}}";

        Response saved = save(body);
        Assert.assertEquals(Status.OK, saved.getStatusInfo().toEnum());
        String stateId = readJson(saved).get("stateId").asText();
        Assert.assertTrue(AppStateStorageEndpoint.isValidStateId(stateId));

        Response loaded = target("app-state/load/" + stateId).request().get();
        Assert.assertEquals(Status.OK, loaded.getStatusInfo().toEnum());
        JsonNode stored = readJson(loaded);
        Assert.assertEquals(stateId, stored.get("id").asText());
        Assert.assertEquals("alice", stored.get("createdBy").asText());
        Assert.assertEquals(pageUrl, stored.get("pageUrl").asText());
        Assert.assertEquals(3, stored.get("states").get("map").get("zoom").asInt());
        Assert.assertEquals(label, stored.get("states").get("map").get("label").asText());
    }

    @Test
    @SubjectAware(username = "alice", password = "alice", configuration = SHIRO_FILE)
    public void testSaveAcceptsStatesAsJsonString() throws Exception {
        Response saved = save("{\"pageUrl\":\"/p\",\"states\":\"{\\\"table\\\":{\\\"currentPage\\\":2}}\"}");
        Assert.assertEquals(Status.OK, saved.getStatusInfo().toEnum());
        String stateId = readJson(saved).get("stateId").asText();

        JsonNode stored = readJson(target("app-state/load/" + stateId).request().get());
        Assert.assertTrue(stored.get("states").isObject());
        Assert.assertEquals(2, stored.get("states").get("table").get("currentPage").asInt());
    }

    @Test
    @SubjectAware(username = "alice", password = "alice", configuration = SHIRO_FILE)
    public void testSaveRejectsInvalidStates() throws Exception {
        Assert.assertEquals(Status.BAD_REQUEST, save("{\"pageUrl\":\"/p\"}").getStatusInfo().toEnum());
        Assert.assertEquals(Status.BAD_REQUEST, save("{\"states\":[1,2]}").getStatusInfo().toEnum());
        Assert.assertEquals(Status.BAD_REQUEST, save("{\"states\":\"not json\"}").getStatusInfo().toEnum());
        // a string can no longer inject fields into the stored document
        Assert.assertEquals(Status.BAD_REQUEST,
                save("{\"states\":\"1,\\\"createdBy\\\":\\\"admin\\\"\"}").getStatusInfo().toEnum());
    }

    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = SHIRO_FILE)
    public void testSaveRequiresPermission() throws Exception {
        Response saved = save("{\"pageUrl\":\"/p\",\"states\":{}}");
        Assert.assertEquals(Status.FORBIDDEN, saved.getStatusInfo().toEnum());
        Assert.assertEquals("Permission denied", readJson(saved).get("error").asText());
    }

    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = SHIRO_FILE)
    public void testGuestCanLoadLegacyState() throws Exception {
        storeRaw(STATE_ID, "{\"id\":\"" + STATE_ID + "\",\"createdAt\":\"2026-01-01T00:00:00Z\","
                + "\"createdBy\":\"alice\",\"pageUrl\":\"/p\",\"states\":\"{\\\"m\\\":{\\\"zoom\\\":5}}\"}");

        Response loaded = target("app-state/load/" + STATE_ID).request().get();
        Assert.assertEquals(Status.OK, loaded.getStatusInfo().toEnum());
        Assert.assertEquals(5, readJson(loaded).get("states").get("m").get("zoom").asInt());
    }

    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = SHIRO_FILE)
    public void testLoadInvalidOrMissingId() throws Exception {
        Assert.assertEquals(Status.BAD_REQUEST,
                target("app-state/load/not-a-uuid").request().get().getStatusInfo().toEnum());
        Assert.assertEquals(Status.BAD_REQUEST,
                target("app-state/load/" + STATE_ID.toUpperCase()).request().get().getStatusInfo().toEnum());
        Assert.assertEquals(Status.NOT_FOUND,
                target("app-state/load/" + STATE_ID).request().get().getStatusInfo().toEnum());
    }

    @Test
    @SubjectAware(username = "alice", password = "alice", configuration = SHIRO_FILE)
    public void testOwnerCanDelete() throws Exception {
        storeState(STATE_ID, "alice");
        Response deleted = target("app-state/delete/" + STATE_ID).request().delete();
        Assert.assertEquals(Status.OK, deleted.getStatusInfo().toEnum());
        Assert.assertFalse(platformStorageRule.getObjectStorage().getObject(statePath(STATE_ID), null).isPresent());
    }

    @Test
    @SubjectAware(username = "bob", password = "bob", configuration = SHIRO_FILE)
    public void testOtherUserCannotDelete() throws Exception {
        storeState(STATE_ID, "alice");
        Response deleted = target("app-state/delete/" + STATE_ID).request().delete();
        Assert.assertEquals(Status.FORBIDDEN, deleted.getStatusInfo().toEnum());
        Assert.assertTrue(platformStorageRule.getObjectStorage().getObject(statePath(STATE_ID), null).isPresent());
    }

    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = SHIRO_FILE)
    public void testDeleteAnyPermission() throws Exception {
        storeState(STATE_ID, "alice");
        Response deleted = target("app-state/delete/" + STATE_ID).request().delete();
        Assert.assertEquals(Status.OK, deleted.getStatusInfo().toEnum());
        Assert.assertEquals(Status.NOT_FOUND,
                target("app-state/delete/" + STATE_ID).request().delete().getStatusInfo().toEnum());
    }

    private Response save(String body) {
        return target("app-state/save").request().post(Entity.entity(body, MediaType.APPLICATION_JSON));
    }

    private JsonNode readJson(Response response) throws Exception {
        return mapper.readTree(response.readEntity(String.class));
    }

    private void storeState(String stateId, String createdBy) throws Exception {
        storeRaw(stateId, "{\"id\":\"" + stateId + "\",\"createdAt\":\"2026-01-01T00:00:00Z\",\"createdBy\":\""
                + createdBy + "\",\"pageUrl\":\"/p\",\"states\":{}}");
    }

    private void storeRaw(String stateId, String json) throws Exception {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        platformStorageRule.getObjectStorage().appendObject(statePath(stateId),
                platformStorageRule.getPlatformStorage().getDefaultMetadata(), new ByteArrayInputStream(bytes),
                bytes.length);
    }

    private static StoragePath statePath(String stateId) {
        return AppStateStorageEndpoint.STATE_FOLDER.resolve(stateId + ".json");
    }
}
