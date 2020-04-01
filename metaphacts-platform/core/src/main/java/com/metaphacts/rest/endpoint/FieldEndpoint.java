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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.metaphacts.services.fields.FieldDefinition;
import com.metaphacts.services.fields.FieldDefinitionManager;

/**
 * Endpoint for retrieval of {@link FieldDefinition}s
 * 
 * Usage:
 * <ul>
 * <li><code>POST /rest/fields/definitions</code> with a JSON body of the form
 * <code>{ "fields": [ "iri1", "iri2" ] }</code> retrieves field definitions for
 * the given field identifiers.</li>
 * </ul>
 * 
 * @author Jeen Broekstra <jb@metaphacts.com>
 *
 */
@Path("fields")
@Singleton
public class FieldEndpoint {

    private static final Logger logger = LogManager.getLogger(FieldEndpoint.class);

    @Inject
    private FieldDefinitionManager fieldDefinitionManager;

    @POST()
    @Path("definitions")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public Response postForFields(Map<String, List<String>> body) {
        try {
            List<IRI> fields = body == null ? new ArrayList<>() : asIRIs(body.get("fields"));
            logger.trace("POST request for field definitions {}", fields);

            return handleFieldDefinitionsRequest(fields);
        } catch (IllegalArgumentException e) {
            return Response.status(Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    private Response handleFieldDefinitionsRequest(List<IRI> fields) {
        final Map<IRI, FieldDefinition> definitions = fields.isEmpty()
                ? fieldDefinitionManager.queryAllFieldDefinitions()
                : fieldDefinitionManager.queryFieldDefinitions(fields);

        List<Map<String, Object>> json = definitions.values().stream()
                .map(field -> fieldDefinitionManager.jsonFromField(field)).collect(Collectors.toList());
        return Response.ok(json).build();
    }

    private List<IRI> asIRIs(List<String> input) throws IllegalArgumentException {
        if (input == null) {
            return new ArrayList<IRI>();
        }
        final ValueFactory vf = SimpleValueFactory.getInstance();
        return input.stream().map(s -> vf.createIRI(s)).collect(Collectors.toList());
    }

}
