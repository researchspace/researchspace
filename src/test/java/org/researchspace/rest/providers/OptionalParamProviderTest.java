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

import java.util.Optional;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTest;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.rest.providers.IriParamProvider;
import org.researchspace.rest.providers.OptionalParamProvider;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class OptionalParamProviderTest extends JerseyTest {
    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    @Override
    protected Application configure() {
        return new ResourceConfig().register(IriParamProvider.class).register(OptionalParamProvider.class)
                .register(OptionalTestEndpoint.class);
    }

    @Test
    public void shouldReturnStringIfStringParamIsRequested() {
        String response = target("/optional/string").queryParam("string", "Hello Test").request().get(String.class);
        Assert.assertEquals(response, "Hello Test");
    }

    @Test
    public void shouldReturnElseIfNoStringParamIsRequested() {
        String response = target("/optional/string").request().get(String.class);
        Assert.assertEquals(response, "No String");
    }

    @Test
    public void shouldReturnIriIfIriParamIsRequested() {
        String response = target("/optional/iri").queryParam("iri", "http://www.researchspace.org/isIri").request()
                .get(String.class);
        Assert.assertEquals(response, "http://www.researchspace.org/isIri");
    }

    @Test
    public void shouldReturnElseIfNoIriParamIsRequested() {
        String response = target("/optional/iri").request().get(String.class);
        Assert.assertEquals(response, "http://www.researchspace.org/noIRI");
    }

    @Path("/optional")
    public static class OptionalTestEndpoint {

        @GET
        @Path("/string")
        public String getOptionalString(@QueryParam("string") Optional<String> string) {
            return string.orElse("No String");
        }

        @GET
        @Path("/iri")
        public String getOptionalIri(@QueryParam("iri") Optional<IRI> iri) {
            return iri.orElse(vf.createIRI("http://www.researchspace.org/noIRI")).stringValue();
        }
    }

}