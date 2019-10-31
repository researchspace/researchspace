/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.rest.endpoint;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import javax.inject.Inject;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import com.metaphacts.services.storage.api.*;
import org.apache.commons.io.IOUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.common.base.Throwables;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.junit.MetaphactsJerseyTest;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.services.storage.api.PlatformStorage.FindResult;

public class ContainerEndpointTest extends MetaphactsJerseyTest {

    private static ValueFactory VF = SimpleValueFactory.getInstance();
    
    private final String queryContainerPermissionsShiroFile = "classpath:com/metaphacts/rest/endpoint/shiro-query-container.ini";

    @Rule
    public ShiroRule shiroRule = new ShiroRule();
    
    @Inject
    private PlatformStorage platformStorage;

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(ContainerEndpoint.class);
    }

    @Before
    public void setUp() throws Exception {
        super.setUp();
        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"), "", RDFFormat.TRIG);
        }
    }

    @After
    public void tearDown() throws Exception {
        super.tearDown();
        repositoryRule.delete();
    }

    /**
     * Check that admin user can delete any resource from query container. Test for api:ldp:*
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void testAdminDeleteAny() throws Exception {
        Response response = deleteResourceRequest("http://localhost:10214/container/queryContainer/test-query2");
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
    }

    /**
     * Check that admin user can get any resource from query container. Test for api:ldp:*
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void testAdminGetAny() throws Exception {
        Response response = this.getResourceRequest("http://localhost:10214/container/queryContainer/test-query2");
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
    }

    /**
     * Check that admin user can add resource to query container and then delete it. Test for api:ldf:* permission
     */
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void testAdminCreateQuery() throws Exception {
        Response response = this.createResourceRequest("http://www.metaphacts.com/ontologies/platform#queryContainer");
        Assert.assertEquals(Status.CREATED.getStatusCode(), response.getStatus());
    }
    
    
    @Test
    @SubjectAware(username = "admin", password = "admin", configuration = queryContainerPermissionsShiroFile)
    public void testCreateAndDeleteWithStorage() throws Exception {
        Response response = this.createResourceRequest("http://www.metaphacts.com/ontologies/platform#queryContainer");
        Assert.assertEquals(Status.CREATED.getStatusCode(), response.getStatus());
        
        // Check that the created resource has been saved in the storage
        MultivaluedMap<String, Object> headers = response.getHeaders();
        String location = (String)headers.getFirst("Location");
        IRI resourceIri = VF.createIRI(location);
        StoragePath objectId = ObjectKind.LDP
            .resolve(RepositoryManager.ASSET_REPOSITORY_ID)
            .resolve(StoragePath.encodeIri(resourceIri))
            .addExtension(".trig");
        Optional<FindResult> optResult = platformStorage.findObject(objectId);
        Assert.assertTrue(optResult.isPresent());
        // Now, delete the resource and check that it was deleted in the storage as well
        response = deleteResourceRequest(resourceIri.stringValue());
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
        optResult = platformStorage.findObject(objectId);
        Assert.assertFalse(optResult.isPresent());
    }

    /**
     * Check that guest user can read queries.
     */
    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = queryContainerPermissionsShiroFile)
    public void testGuestCanRead() throws Exception {
        Response response = this.getResourceRequest("http://localhost:10214/container/queryContainer/test-query2");
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
    }
    
    /**
     * Check that guest user with read-only permissions can't remove queries.
     */
    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = queryContainerPermissionsShiroFile)
    public void testGuestCantDelete() throws Exception {
        Response response = deleteResourceRequest("http://localhost:10214/container/queryContainer/test-query");
        Assert.assertEquals(Status.FORBIDDEN.getStatusCode(), response.getStatus());
    }
    
    /**
     * Check that guest user with read-only permissions can't add queries.
     */
    @Test
    @SubjectAware(username = "guest", password = "guest", configuration = queryContainerPermissionsShiroFile)
    public void testGuestCantCreate() throws Exception {
        Response response = createResourceRequest("http://localhost:10214/container/queryContainer/test-query");
        Assert.assertEquals(Status.FORBIDDEN.getStatusCode(), response.getStatus());
    }

    /**
     * Check that user without ldp permissions can't remove queries.
     */
    @Test
    @SubjectAware(username = "noPermission", password = "noPermission", configuration = queryContainerPermissionsShiroFile)
    public void testWithoutPermissionsCantDelete() throws Exception {
        Response response = deleteResourceRequest("http://localhost:10214/container/queryContainer/test-query");
        Assert.assertEquals(Status.FORBIDDEN.getStatusCode(), response.getStatus());
    }
    
    /**
     * Check that user without ldp permissions can't add queries.
     */
    @Test
    @SubjectAware(username = "noPermission", password = "noPermission", configuration = queryContainerPermissionsShiroFile)
    public void testWithoutPermissionsCantCreate() throws Exception {
        Response response = createResourceRequest("http://localhost:10214/container/queryContainer/test-query3");
        Assert.assertEquals(Status.FORBIDDEN.getStatusCode(), response.getStatus());
    }
    
    /**
     * Check that user without ldp permissions can't read queries.
     */
    @Test
    @SubjectAware(username = "noPermission", password = "noPermission", configuration = queryContainerPermissionsShiroFile)
    public void testWithoutPermissionsCantGet() throws Exception {
        Response response = this.getResourceRequest("http://localhost:10214/container/queryContainer/test-query");
        Assert.assertEquals(Status.FORBIDDEN.getStatusCode(), response.getStatus());
    }

    private Response getResourceRequest(String resource) {
        return target("/").queryParam("uri", resource).request().accept(RDFFormat.TURTLE.getDefaultMIMEType()).get();
    }
    
    private Response deleteResourceRequest(String resource) {
        return target("/").queryParam("uri", resource).request().delete();
    }
    
    private Response createResourceRequest(String slug) {
        try {
            String queryData = IOUtils.toString(LDPApiInternal.class.getResourceAsStream("testSampleQuery.ttl"), StandardCharsets.UTF_8);
            return target("/").queryParam("uri", "http://www.metaphacts.com/ontologies/platform#queryContainer")
                    .queryParam("Slug", slug).request()
                    .post(Entity.<String>entity(queryData, RDFFormat.TURTLE.getDefaultMIMEType()));
        } catch (IOException e) {
            throw Throwables.propagate(e);
        }
    }
}
