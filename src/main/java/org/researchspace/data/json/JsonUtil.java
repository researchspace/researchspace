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

package org.researchspace.data.json;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;
import java.util.function.BiConsumer;

import javax.ws.rs.core.StreamingOutput;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.base.Throwables;

/**
 * @author Aretm Kozlov <ak@metaphacts.com>
 */
public class JsonUtil {

    private static final ObjectMapper mapper = new ObjectMapper();
    static {
        SimpleModule module = new SimpleModule();
        module.addSerializer(Resource.class, new RdfValueSerializers.ResourceSerializer());
        module.addSerializer(IRI.class, new RdfValueSerializers.IriSerializer());
        mapper.registerModule(module);
    }

    public static <T> String toJson(T obj) throws RuntimeException {
        String json = null;
        try {
            json = JsonUtil.mapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            Throwables.propagate(e);
        }
        return json;
    }

    public static <T> String prettyPrintJson(T obj) throws RuntimeException {
        String json = null;
        try {
            json = JsonUtil.mapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            Throwables.propagate(e);
        }
        return json;
    }

    public static ObjectMapper getDefaultObjectMapper() {
        return mapper;
    }

    @FunctionalInterface
    public static interface JsonFieldProducer extends BiConsumer<JsonGenerator, String> {
    }

    /**
     * Utility that helps to map over JSON Array in a streaming fashion, apply some
     * function for every value, and produce JSON object where initial value will be
     * used as a key and produced one as a value.
     */
    public static StreamingOutput processJsonMap(final JsonParser jp, final JsonFieldProducer fn) throws IOException {
        return new StreamingOutput() {
            @Override
            public void write(OutputStream os) throws IOException {
                JsonFactory jfactory = new JsonFactory();
                try (JsonGenerator jGenerator = jfactory.createGenerator(os)) {
                    jGenerator.writeStartObject();
                    while (jp.nextToken() != JsonToken.END_ARRAY) {
                        String iriString = jp.getText();
                        fn.accept(jGenerator, iriString);
                    }
                    jGenerator.writeEndObject();
                }
            }
        };
    }

    public static Iterable<Map.Entry<String, JsonNode>> iterate(ObjectNode node) {
        return node::fields;
    }

    public static Iterable<JsonNode> iterate(ArrayNode node) {
        return node::elements;
    }

    public static ObjectNode toObjectNode(JsonNode node) {
        return shallowMerge(node, NullNode.getInstance());
    }

    public static ObjectNode shallowMerge(JsonNode first, JsonNode second) {
        if (first instanceof ObjectNode && second instanceof ObjectNode) {
            ObjectNode result = mapper.createObjectNode();
            assign(result, first);
            assign(result, second);
            return result;
        } else if (first instanceof ObjectNode) {
            return (ObjectNode) first;
        } else if (second instanceof ObjectNode) {
            return (ObjectNode) second;
        } else {
            return mapper.createObjectNode();
        }
    }

    public static void assign(ObjectNode target, JsonNode source) {
        if (source instanceof ObjectNode) {
            target.setAll((ObjectNode) source);
        }
    }
}
