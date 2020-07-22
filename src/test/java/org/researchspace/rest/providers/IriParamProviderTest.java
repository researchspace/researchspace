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

import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.model.IRI;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTestNg;
import org.hamcrest.Matchers;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.rest.providers.IriParamProvider;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class IriParamProviderTest extends JerseyTestNg.ContainerPerClassTest {

    @Override
    protected Application configure() {
        return new ResourceConfig().register(IriParamProvider.class).register(IriTestEndpoint.class);
    }

    @Test
    public void shouldReturnSameIriAsRequested() {
        String response = target("/iri/iri").queryParam("iri", "http://www.researchspace.org/testIRI").request()
                .get(String.class);
        Assert.assertEquals(response, "http://www.researchspace.org/testIRI");
    }

    @Test
    public void shouldReturnNoIriForNull() {
        String response = target("/iri/null-iri").request().get(String.class);
        Assert.assertEquals(response, "No IRI");
    }

    @Test
    public void shouldReturnNoIri() {
        String response = target("/iri/null-iri").queryParam("iri", "http://www.researchspace.org/testIRI").request()
                .get(String.class);
        Assert.assertEquals(response, "Should not happen");
    }

    @Test
    public void shouldReturnDefaultIri() {
        String response = target("/iri/default-iri").request().get(String.class);
        Assert.assertEquals(response, "http://www.researchspace.org/defaultIRI");
    }

    @Test
    public void shouldReturnNotDefaultIri() {
        String response = target("/iri/default-iri").queryParam("iri", "http://www.researchspace.org/testIRI").request()
                .get(String.class);
        Assert.assertEquals(response, "http://www.researchspace.org/testIRI");
    }

    @Test
    public void notAnAbsoluteUri() {
        Response response = target("/iri/default-iri").queryParam("iri", "not valid").request().get();
        Assert.assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.getStatus());
        Assert.assertEquals("IRI \"not valid\" is not an absolute IRI.", response.readEntity(String.class));
    }

    @Test
    public void nonValidURI() {
        Response response = target("/iri/default-iri").queryParam("iri", "http://this:is:not:valid.com/abc").request()
                .get();
        Assert.assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.getStatus());
        Assert.assertThat(response.readEntity(String.class),
                Matchers.containsString("absolute or empty path expected"));
    }

    @Path("/iri")
    public static class IriTestEndpoint {

        @GET
        @Path("/iri")
        public String getMessage(@QueryParam("iri") IRI iri) {
            return iri.stringValue();
        }

        @GET
        @Path("/null-iri")
        public String getNoString(@QueryParam("iri") IRI iri) {
            if (iri == null) {
                return "No IRI";
            }
            return "Should not happen";
        }

        @GET
        @Path("/default-iri")
        public String getDefaultString(@DefaultValue("http://www.researchspace.org/defaultIRI") @QueryParam("iri") IRI iri) {
            return iri.toString();
        }
    }

}