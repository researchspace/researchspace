/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2020, metaphacts GmbH
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
import org.researchspace.config.Configuration;
import org.researchspace.data.rdf.container.FieldDefinitionContainer;
import org.researchspace.junit.JerseyTest;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.rest.endpoint.FieldEndpoint;
import org.researchspace.vocabulary.FIELDS;

import com.github.sdorra.shiro.ShiroRule;

@Ignore // TODO reactivate once available in develop >= 3.4
public class FieldEndpointTest extends JerseyTest {

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

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();

        // load some field definitions
        // @formatter:off
        Model m = new ModelBuilder().setNamespace(LDP.NS).setNamespace("field", FIELDS.NAMESPACE)
                .setNamespace("ex", "http://example.org/")
                .add(FieldDefinitionContainer.IRI_STRING, "ldp:contains", "ex:field1").subject("ex:field1")
                .add(RDF.TYPE, "field:Field").add(RDFS.COMMENT, "a comment for field 1").subject("ex:field2")
                .add(RDF.TYPE, "field:Field").add(RDFS.COMMENT, "a comment for field 2").build();
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
