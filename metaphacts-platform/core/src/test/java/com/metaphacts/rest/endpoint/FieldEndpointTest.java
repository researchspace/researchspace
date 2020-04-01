/*
 * Copyright (C) 2015-2020, metaphacts GmbH
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

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.ModelBuilder;
import org.eclipse.rdf4j.model.vocabulary.LDP;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.metaphacts.config.Configuration;
import com.metaphacts.data.rdf.container.FieldDefinitionContainer;
import com.metaphacts.junit.MetaphactsJerseyTest;
import com.metaphacts.junit.PlatformStorageRule;
import com.metaphacts.vocabulary.FIELDS;

@Ignore // TODO reactivate once available in develop >= 3.4
public class FieldEndpointTest extends MetaphactsJerseyTest {

    @Inject
    public Configuration configuration;

    @Inject
    @Rule
    public PlatformStorageRule platformStorageRule;

    @Rule
    public ShiroRule shiroRule = new ShiroRule();

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(FieldEndpoint.class);
    }

    @Before
    public void setUp() throws Exception {
        super.setUp();

        // load some field definitions
        // @formatter:off 
        Model m = new ModelBuilder()
                .setNamespace(LDP.NS)
                .setNamespace("field", FIELDS.NAMESPACE)
                .setNamespace("ex", "http://example.org/")
                .add(FieldDefinitionContainer.IRI_STRING, "ldp:contains", "ex:field1")
                .subject("ex:field1")
                    .add(RDF.TYPE, "field:Field")
                    .add(RDFS.COMMENT, "a comment for field 1")
                .subject("ex:field2")
                    .add(RDF.TYPE, "field:Field")
                    .add(RDFS.COMMENT, "a comment for field 2")
                .build();
        // @formatter:on

        Repositories.consume(repositoryRule.getAssetRepository(), conn -> conn.add(m));
    }

    @Test
    public void testRequestAllFieldDefinitions() throws Exception {
        Response response = target("fields/definitions").request().post(null);
        assertThat(response.getStatusInfo(), is(Status.OK));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fieldDefinitions = Arrays.asList(response.readEntity(Map[].class));
        assertThat(fieldDefinitions.size(), is(2));
    }

    @Test
    public void testRequestSomeFieldDefinitions() throws Exception {
        Response response = target("fields/definitions").request()
                .post(Entity.json("{ \"fields\": [\"http://example.org/field1\"] }"));
        assertThat(response.getStatusInfo(), is(Status.OK));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fieldDefinitions = Arrays.asList(response.readEntity(Map[].class));
        assertThat(fieldDefinitions.size(), is(1));

        Map<String, Object> fieldDefinition = fieldDefinitions.get(0);
        assertThat(fieldDefinition.get("iri"), is("http://example.org/field1"));
    }

    @Test
    public void testRequestNonExistentFieldDefinitions() throws Exception {
        Response response = target("fields/definitions").request()
                .post(Entity.json("{ \"fields\": [\"http://example.org/non-existent\"] }"));
        assertThat(response.getStatusInfo(), is(Status.OK));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fieldDefinitions = Arrays.asList(response.readEntity(Map[].class));
        assertThat(fieldDefinitions.size(), is(0));
    }

    @Test
    public void testRequestInvalidFieldIRI() throws Exception {
        Response response = target("fields/definitions").request()
                .post(Entity.json("{ \"fields\": [\"this is not a valid iri. \"] }"));
        assertThat(response.getStatusInfo(), is(Status.BAD_REQUEST));
    }

}
