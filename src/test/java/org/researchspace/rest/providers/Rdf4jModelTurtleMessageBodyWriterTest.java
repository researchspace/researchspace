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

package org.researchspace.rest.providers;

import java.io.InputStream;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.ModelBuilder;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.junit.JerseyTest;
import org.researchspace.rest.providers.Rdf4jModelTurtleMessageBodyWriter;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class Rdf4jModelTurtleMessageBodyWriterTest extends JerseyTest {
    private final static Model testModel = new ModelBuilder().setNamespace("ex", "http://example.org/").subject("ex:s")
            .add(FOAF.NAME, "Joe").build();

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(Rdf4jModelTurtleMessageBodyWriter.class).register(TurleWriterEndpoint.class);
    }

    @Test
    public void testTextTurtle() throws Exception {
        Response response = target("/turtletest").request().accept("text/turtle").get();
        Assert.assertEquals(Status.OK.getStatusCode(), response.getStatus());
        Assert.assertTrue(
                Models.isomorphic(testModel, Rio.parse((InputStream) response.getEntity(), "", RDFFormat.TURTLE)));
    }

    @Test
    public void testUnkownAcceptHeader() throws Exception {
        Response response = target("/turtletest").request().accept("application/x-tutle").get();
        Assert.assertEquals(Status.NOT_ACCEPTABLE.getStatusCode(), response.getStatus());
    }

    @Path("/turtletest")
    public static class TurleWriterEndpoint {

        @GET
        @Path("")
        @Produces({ "text/turtle", "application/x-turtle" })
        public Model getMessage() {
            return testModel;
        }
    }
}
