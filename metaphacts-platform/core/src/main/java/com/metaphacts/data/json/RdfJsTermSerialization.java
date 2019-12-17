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
import java.util.Optional;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.node.JsonNodeType;

/**
 * Defines Jackson (de)serializer for RDF {@link Value}s using the RDF JS
 * standard.
 * 
 * @author am
 * @author as
 *
 */
public final class RdfJsTermSerialization {
    private RdfJsTermSerialization() {}

    public static final SimpleModule MODULE = new SimpleModule();
    static {
        MODULE.addSerializer(Value.class, new ValueSerializer());
        MODULE.addDeserializer(Value.class, new ValueDeserializer());
        MODULE.addSerializer(IRI.class, new IriSerializer());
        MODULE.addDeserializer(IRI.class, new IriDeserializer());
        MODULE.addSerializer(Literal.class, new LiteralSerializer());
        MODULE.addDeserializer(Literal.class, new LiteralDeserializer());
        MODULE.addSerializer(BNode.class, new BNodeSerializer());
        MODULE.addDeserializer(BNode.class, new BNodeDeserializer());
    }

    public static class ValueSerializer extends JsonSerializer<Value> {
        @Override
        public void serialize(Value value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            serializeValue(value, gen);
        }
    }

    public static class ValueDeserializer extends JsonDeserializer<Value> {
        @Override
        public Value deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            return deserializeValue(jp);
        }
    }

    public static class IriSerializer extends JsonSerializer<IRI> {
        @Override
        public void serialize(IRI value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            serializeValue(value, gen);
        }
    }

    public static class IriDeserializer extends JsonDeserializer<IRI> {
        @Override
        public IRI deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            return (IRI)deserializeValue(jp);
        }
    }

    public static class LiteralSerializer extends JsonSerializer<Literal> {
        @Override
        public void serialize(Literal value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            serializeValue(value, gen);
        }
    }

    public static class LiteralDeserializer extends JsonDeserializer<Literal> {
        @Override
        public Literal deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            return (Literal)deserializeValue(jp);
        }
    }

    public static class BNodeSerializer extends JsonSerializer<BNode> {
        @Override
        public void serialize(BNode value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            serializeValue(value, gen);
        }
    }

    public static class BNodeDeserializer extends JsonDeserializer<BNode> {
        @Override
        public BNode deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            return (BNode)deserializeValue(jp);
        }
    }

    private static Value deserializeValue(JsonParser jp) throws IOException {
        ValueFactory vf = SimpleValueFactory.getInstance();
        JsonNode node = jp.getCodec().readTree(jp);
        if (node.getNodeType() != JsonNodeType.OBJECT) {
            throw new RuntimeException("Node type for RDF Term is not an object");
        }

        JsonNode termTypeNode = node.get("termType");
        if (termTypeNode == null || termTypeNode.getNodeType() != JsonNodeType.STRING) {
            throw new RuntimeException(
                "Missing or invalid node for Term.termType property");
        }
        String termType = termTypeNode.asText();

        JsonNode valueNode = node.get("value");
        if (valueNode == null || valueNode.getNodeType() != JsonNodeType.STRING) {
            throw new RuntimeException(
                "Missing or invalid node for Term.value property");
        }
        String value = valueNode.asText();

        switch (termType) {
            case "NamedNode": {
                return vf.createIRI(value);
            }
            case "Literal": {
                JsonNode datatypeNode = node.get("datatype");
                IRI datatype = datatypeNode != null ? jp.getCodec().treeToValue(datatypeNode, IRI.class) : XMLSchema.STRING;

                JsonNode languageNode = node.get("language");
                if (languageNode == null) {
                    return vf.createLiteral(valueNode.asText(), datatype);
                }

                if (languageNode.getNodeType() != JsonNodeType.STRING) {
                    throw new RuntimeException(
                        "Invalid node type for Literal.language property");
                }

                String language = languageNode.asText();
                return language.isEmpty()
                    ? vf.createLiteral(value, datatype)
                    : vf.createLiteral(value, language);
            }
            case "BlankNode": {
                return vf.createBNode(value);
            }
            default: {
                throw new RuntimeException("Unsupported term type: \"" + termType + "\"");
            }
        }
    }

    private static void serializeValue(Value v, JsonGenerator jsonGenerator) throws IOException {
        
        if (v == null) {
            throw new IllegalArgumentException("Not supported to serialize null value");
        }
        
        jsonGenerator.writeStartObject();
        
        if (v instanceof IRI) {
            jsonGenerator.writeStringField("termType", "NamedNode");
            jsonGenerator.writeStringField("value", v.stringValue());
        }

        else if (v instanceof Literal) {
            jsonGenerator.writeStringField("termType", "Literal");
            jsonGenerator.writeStringField("value", v.stringValue());
            jsonGenerator.writeObjectField("datatype", ((Literal) v).getDatatype());
            Optional<String> language = ((Literal) v).getLanguage();
            if (language.isPresent()) {
                jsonGenerator.writeStringField("language", language.get());
            }
        }
        
        else if (v instanceof BNode) {
            jsonGenerator.writeStringField("termType", "Literal");
            jsonGenerator.writeStringField("value", v.stringValue());
        }

        jsonGenerator.writeEndObject();
    }


}
