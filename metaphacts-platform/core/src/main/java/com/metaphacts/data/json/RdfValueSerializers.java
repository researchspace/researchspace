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

package com.metaphacts.data.json;

import java.io.IOException;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

/**
 * @author Aretm Kozlov <ak@metaphacts.com>
 */
public class RdfValueSerializers {

    public static class ResourceSerializer extends JsonSerializer<Resource> {
        @Override
        public void serialize(Resource resource, JsonGenerator jsonGenerator,
                              SerializerProvider serializerProvider) throws IOException, JsonProcessingException {
            serializeUri(resource, jsonGenerator);
        }
    }

    public static class IriSerializer extends JsonSerializer<IRI> {
        @Override
        public void serialize(IRI value, JsonGenerator jsonGenerator,
                SerializerProvider serializerProvider) throws IOException, JsonProcessingException {
            serializeUri(value, jsonGenerator);
        }
    }

    static private void serializeUri(Resource value, JsonGenerator jsonGenerator) throws IOException {
        jsonGenerator.writeStartObject();
        jsonGenerator.writeStringField("@id", value.stringValue());
        jsonGenerator.writeEndObject();
    }
}