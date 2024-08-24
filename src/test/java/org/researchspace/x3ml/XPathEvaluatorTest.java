package org.researchspace.x3ml;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.junit.Test;
import org.researchspace.x3ml.XPathBuilder;
import org.researchspace.x3ml.XPathEvaluator;
import org.researchspace.x3ml.XPathEvaluator.XPathResult;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

public class XPathEvaluatorTest {

    @Test
    public void testEvaluateXPath() throws Exception {
        XPathEvaluator evaluator = new XPathEvaluator();
        
        // Read XML file from resources
        String resourcePath = "org/researchspace/x3ml/08027714.xml";
        InputStream xmlInput = getClass().getClassLoader().getResourceAsStream(resourcePath);
        assertNotNull("Resource file not found!", xmlInput);
        
        // Define the list of XPaths to evaluate
        List<String> xpaths = new ArrayList<>();
        xpaths.add("/obj/a5108"); // Example XPath, adjust based on actual XML content

        // Process using the XPathEvaluator
        List<XPathResult> results = evaluator.evaluate(xmlInput, xpaths);

        // Print results nicely
        for (XPathResult result : results) {
            System.out.println("Value: " + result.getAbsoluteXPath());
            System.out.println("Start Line: " + result.getStartLine());
            System.out.println("Start Offset: " + result.getStartOffset());
            System.out.println("End Line: " + result.getEndLine());
            System.out.println("End Offset: " + result.getEndOffset());
            System.out.println("----------------------");
        }
        
        xmlInput.close();
    }

    @Test
    public void testBuildXPathFromPosition_1() throws Exception {
        String resourcePath = "org/researchspace/x3ml/08027714.xml";
        InputStream xmlInput = getClass().getClassLoader().getResourceAsStream(resourcePath);

        assertEquals("/obj[1]/a5108[2]/a5116[1]", XPathBuilder.buildXPathFromPosition(xmlInput, 8, 29));
    }

    @Test
    public void testBuildXPathFromPosition_2() throws Exception {
        String resourcePath = "org/researchspace/x3ml/08027714.xml";
        InputStream xmlInput = getClass().getClassLoader().getResourceAsStream(resourcePath);

        assertEquals("/obj[1]/aob30[1]/a3000[1]", XPathBuilder.buildXPathFromPosition(xmlInput, 17, 57));
    }

    @Test
    public void testBuildXPathFromPosition_3() throws Exception {
        String resourcePath = "org/researchspace/x3ml/08027714.xml";
        InputStream xmlInput = getClass().getClassLoader().getResourceAsStream(resourcePath);

        assertEquals("/obj[1]/aob30[1]/a31nn[1]", XPathBuilder.buildXPathFromPosition(xmlInput, 17, 102));
    }

    @Test
    public void testBuildXPathFromPosition_4() throws Exception {
        String resourcePath = "org/researchspace/x3ml/08027714.xml";
        InputStream xmlInput = getClass().getClassLoader().getResourceAsStream(resourcePath);

        assertEquals("/obj[1]/aob30[1]/a31nn[1]", XPathBuilder.buildXPathFromPosition(xmlInput, 17, 84));
    }
}
