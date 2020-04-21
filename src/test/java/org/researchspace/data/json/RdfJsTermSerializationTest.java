package org.researchspace.data.json;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;
import org.researchspace.data.json.RdfJsTermSerialization;

import com.fasterxml.jackson.databind.ObjectMapper;

public class RdfJsTermSerializationTest {

    static ObjectMapper mapper;

    static ValueFactory vf = SimpleValueFactory.getInstance();

    @BeforeClass
    public static void beforeClass() throws Exception {
        mapper = new ObjectMapper();
        mapper.registerModule(RdfJsTermSerialization.MODULE);
    }

    @Test
    public void testSerialize() throws Exception {

        Assert.assertEquals("{\"termType\":\"NamedNode\",\"value\":\"http://example.org/subject\"}",
                mapper.writeValueAsString(vf.createIRI("http://example.org/subject")));

        Assert.assertEquals(
                "{\"termType\":\"Literal\",\"value\":\"Hello World\",\"datatype\":{\"termType\":\"NamedNode\",\"value\":\""
                        + XMLSchema.STRING + "\"}}",
                mapper.writeValueAsString(vf.createLiteral("Hello World")));

        Assert.assertEquals(
                "{\"termType\":\"Literal\",\"value\":\"42\",\"datatype\":{\"termType\":\"NamedNode\",\"value\":\""
                        + XMLSchema.INT + "\"}}",
                mapper.writeValueAsString(vf.createLiteral(42)));

        Assert.assertEquals(
                "{\"termType\":\"Literal\",\"value\":\"Hallo Welt\",\"datatype\":{\"termType\":\"NamedNode\",\"value\":\"http://www.w3.org/1999/02/22-rdf-syntax-ns#langString\"},\"language\":\"de\"}",
                mapper.writeValueAsString(vf.createLiteral("Hallo Welt", "de")));
    }

    @Test
    public void testDeserialize() throws Exception {

        Assert.assertEquals(vf.createIRI("http://example.org/subject"), mapper
                .readValue("{\"termType\" : \"NamedNode\", \"value\" : \"http://example.org/subject\"}", Value.class));

        Assert.assertEquals(vf.createIRI("http://example.org/subject"), mapper
                .readValue("{\"termType\" : \"NamedNode\", \"value\" : \"http://example.org/subject\"}", IRI.class));

        Assert.assertEquals(vf.createLiteral("Hello World"), mapper.readValue(
                "{\"termType\" : \"Literal\", \"value\" : \"Hello World\",  \"datatype\" : { \"termType\" : \"NamedNode\", \"value\" : \""
                        + XMLSchema.STRING + "\" } }",
                Value.class));

        Assert.assertEquals(vf.createLiteral("Hello World"), mapper.readValue(
                "{\"termType\" : \"Literal\", \"value\" : \"Hello World\",  \"datatype\" : { \"termType\" : \"NamedNode\", \"value\" : \""
                        + XMLSchema.STRING + "\" } }",
                Literal.class));

        Assert.assertEquals(vf.createLiteral(42), mapper.readValue(
                "{\"termType\" : \"Literal\", \"value\" : \"42\",  \"datatype\" : { \"termType\" : \"NamedNode\", \"value\" : \""
                        + XMLSchema.INT + "\" } }",
                Value.class));

        Assert.assertEquals(vf.createLiteral("Hallo Welt", "de"), mapper.readValue(
                "{\"termType\" : \"Literal\", \"value\" : \"Hallo Welt\", \"language\" : \"de\", \"datatype\" : { \"termType\" : \"NamedNode\", \"value\" : \"http://www.w3.org/1999/02/22-rdf-syntax-ns#langString\" } }",
                Literal.class));

    }

    @Test
    public void testSymmetry() throws Exception {

        Assert.assertEquals(vf.createIRI("http://example.org/subject"),
                mapper.readValue(mapper.writeValueAsString(vf.createIRI("http://example.org/subject")), IRI.class));

        Assert.assertEquals(vf.createLiteral("Hello World"),
                mapper.readValue(mapper.writeValueAsString(vf.createLiteral("Hello World")), Literal.class));

        Assert.assertEquals(vf.createLiteral("Hallo Welt", "de"),
                mapper.readValue(mapper.writeValueAsString(vf.createLiteral("Hallo Welt", "de")), Value.class));

        Assert.assertEquals(vf.createLiteral(42),
                mapper.readValue(mapper.writeValueAsString(vf.createLiteral(42)), Literal.class));
    }
}
