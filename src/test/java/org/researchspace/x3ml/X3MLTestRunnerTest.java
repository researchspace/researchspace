package org.researchspace.x3ml;

import java.io.IOException;
import java.io.InputStream;

import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.junit.Test;

import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;

public class X3MLTestRunnerTest {
    
    @Test
    public void testX3MLRun() throws IOException {
        String mappingsPath = "org/researchspace/x3ml/midas/midas-mappings-00.xml";
        String generatorPolicyPath = "org/researchspace/x3ml/midas/midas-generator-policy-00.xml";
        String xmlData = "org/researchspace/x3ml/midas/08047185-00.xml";
        String expectedOutput = "org/researchspace/x3ml/midas/08047185-00.ttl";

        X3MLTestRunner testRunner = null;//new X3MLTestRunner(getResource(mappingsPath), getResource(generatorPolicyPath));
        Model outputRdf = testRunner.runX3ML(getResource(xmlData));

        Model expectedRdf = ModelFactory.createDefaultModel();
        RDFDataMgr.read(expectedRdf, getResource(expectedOutput), Lang.TURTLE);

        // Load the first RDF file
        try (InputStream expected = getResource(expectedOutput)) {
            RDFDataMgr.read(expectedRdf, expected, Lang.TURTLE);
        }

        System.out.println("Expected:");
        expectedRdf.write(System.out, "TURTLE");

        boolean isTheSame = outputRdf.isIsomorphicWith(expectedRdf);
        if (!isTheSame) {
            System.out.println("Output is not the same as expected");
            System.out.println("New triples:");
            outputRdf.difference(expectedRdf).write(System.out, "TURTLE");

            System.out.println("Deleted triples:");
            expectedRdf.difference(outputRdf).write(System.out, "TURTLE");
        }
    }

    private InputStream getResource(String mappingsPath) {
        return getClass().getClassLoader().getResourceAsStream(mappingsPath);
    }
}
