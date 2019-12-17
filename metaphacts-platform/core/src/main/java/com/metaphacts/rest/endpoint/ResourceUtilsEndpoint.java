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

import static java.util.stream.Collectors.toMap;
import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

import java.io.IOException;
import java.io.OutputStream;
import java.util.*;
import java.util.function.Function;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;

import com.metaphacts.thumbnails.ThumbnailServiceRegistry;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Literals;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.rest.feature.CacheControl.NoCache;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Michael Schmidt <ms@metaphacts.com>
 */
@Singleton
@NoCache
@Path("data/rdf/utils")
public class ResourceUtilsEndpoint {

    @Inject
    private LabelCache labelCache;

    @Inject
    private ThumbnailServiceRegistry thumbnailServiceRegistry;

    @Inject
    private RepositoryManager repositoryManager;

    @POST
    @Path("getLabelsForRdfValue")
    @Produces(APPLICATION_JSON)
    @Consumes(APPLICATION_JSON)
    public Response getLabelsForRdfValue(
        @QueryParam("repository") final Optional<String> repositoryId,
        @QueryParam("preferredLanguage") Optional<String> preferredLanguage,
        final JsonParser jp
    ) throws IOException, RepositoryException {
        Repository repo = repositoryManager.getRepository(repositoryId).orElse(repositoryManager.getDefault());
        StreamingOutput stream = new StreamingOutput() {
            @Override
            public void write(OutputStream os) throws IOException,
                    WebApplicationException {
                JsonFactory jsonFactory = new JsonFactory();
                try(JsonGenerator output = jsonFactory.createGenerator(os)) {
                    output.writeStartObject();

                    Map<IRI, String> iriToUriString = readResourceIris(jp);

                    Optional<String> normalizedLanguageTag = preferredLanguage
                        .flatMap(tag -> Optional.ofNullable(Literals.normalizeLanguageTag(tag)));

                    Map<IRI, Optional<Literal>> labelMap = labelCache.getLabels(
                        iriToUriString.keySet(), repo, normalizedLanguageTag.orElse(null));
                    // write final bulk
                    for (IRI iri : labelMap.keySet()) {
                        Optional<Literal> label = labelMap.get(iri);
                        output.writeStringField(
                            iriToUriString.get(iri),
                            LabelCache.resolveLabelWithFallback(label, iri)
                        );
                    }

                    // clear temp data structures
                    output.writeEndObject();
                }
            }
        };
        return Response.ok(stream).build();
    }

    /**
     * @return resource IRIs with original representation
     */
    private Map<IRI, String> readResourceIris(JsonParser input) throws IOException {
        ValueFactory vf = SimpleValueFactory.getInstance();
        Map<IRI, String> iriToUriString = new LinkedHashMap<>();
        while (input.nextToken() != JsonToken.END_ARRAY) {

            final String uriString = input.getText();
            final IRI iri = vf.createIRI(uriString);

            iriToUriString.put(iri, uriString);
        }
        return iriToUriString;
    }

    @POST
    @Path("thumbnails/{service}")
    @Produces(APPLICATION_JSON)
    @Consumes(APPLICATION_JSON)
    public Response getThumbnailURLs(
        @PathParam("service") String service, List<String> resources,
        @QueryParam("repository") Optional<String> repositoryId
    ) {
        return thumbnailServiceRegistry.get(service).map(thumbnailService -> {
            Repository repo = repositoryManager.getRepository(repositoryId).orElse(repositoryManager.getDefault());
            ValueFactory vf = SimpleValueFactory.getInstance();
            Map<IRI, String> resourceIRIs = resources.stream().collect(
                toMap(vf::createIRI, Function.identity()));

            Map<IRI, Optional<Value>> thumbnails = thumbnailService.getThumbnails(repo, resourceIRIs.keySet());

            StreamingOutput stream = output -> {
                try (JsonGenerator json = new JsonFactory().createGenerator(output)) {
                    json.writeStartObject();

                    for (IRI iri : resourceIRIs.keySet()) {
                        Optional<Value> thumbnail = thumbnails.get(iri);
                        json.writeStringField(
                            resourceIRIs.get(iri),
                            thumbnail.map(Value::stringValue).orElse(null));
                    }

                    json.writeEndObject();
                }
            };

            return Response.ok(stream);
        }).orElse(Response.status(Response.Status.NOT_FOUND)
            .entity(String.format("\"Thumbnail service '%s' not found.\"", service))
        ).build();
    }
}
