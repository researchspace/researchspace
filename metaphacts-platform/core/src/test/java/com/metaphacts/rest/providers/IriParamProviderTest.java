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

package com.metaphacts.rest.providers;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;

import org.eclipse.rdf4j.model.IRI;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTest;
import org.glassfish.jersey.test.JerseyTestNg;
import org.junit.Assert;
import org.junit.Test;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class IriParamProviderTest extends JerseyTestNg.ContainerPerClassTest {
    
    @Override
    protected Application configure() {
        return new ResourceConfig()
                .register(IriParamProvider.class)
                .register(IriTestEndpoint.class);
    }
    
    @Test
    public void shouldReturnSameIriAsRequested() {
        String response = target("/iri/iri").queryParam("iri", "http://metaphacts.com/testIRI").request().get(String.class);
        Assert.assertEquals(response, "http://metaphacts.com/testIRI");
    }
    
    @Test
    public void shouldReturnNoIriForNull() {
        String response = target("/iri/null-iri").request().get(String.class);
        Assert.assertEquals(response, "No IRI");
    }
    
    @Test
    public void shouldReturnNoIri() {
        String response = target("/iri/null-iri").queryParam("iri", "http://metaphacts.com/testIRI").request().get(String.class);
        Assert.assertEquals(response, "Should not happen");
    }
    
    @Test
    public void shouldReturnDefaultIri() {
        String response = target("/iri/default-iri").request().get(String.class);
        Assert.assertEquals(response, "http://metaphacts.com/defaultIRI");
    }

    @Test
    public void shouldReturnNotDefaultIri() {
        String response = target("/iri/default-iri").queryParam("iri", "http://metaphacts.com/testIRI").request().get(String.class);
        Assert.assertEquals(response, "http://metaphacts.com/testIRI");
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
            if(iri==null){
                return "No IRI";
            }
            return "Should not happen";
        }
        
        @GET
        @Path("/default-iri")
        public String getDefaultString(@DefaultValue("http://metaphacts.com/defaultIRI") @QueryParam("iri") IRI iri) {
            return iri.toString();
        }
    }

}