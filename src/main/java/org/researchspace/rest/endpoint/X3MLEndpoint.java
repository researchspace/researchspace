/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
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
package org.researchspace.rest.endpoint;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.xml.parsers.DocumentBuilderFactory;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.glassfish.jersey.media.multipart.MultiPart;
import org.glassfish.jersey.media.multipart.MultiPartMediaTypes;
import org.researchspace.services.x3ml.X3MLToKnowledgePattern;
import org.researchspace.x3ml.TestResult;
import org.researchspace.x3ml.X3MLTestRunner;
import org.researchspace.x3ml.XPathBuilder;
import org.researchspace.x3ml.XPathEvaluator;
import org.w3c.dom.Document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import gr.forth.ics.isl.x3ml.X3MLEngine;
import gr.forth.ics.isl.x3ml.X3MLEngine.Output;
import gr.forth.ics.isl.x3ml.X3MLGeneratorPolicy;
import gr.forth.ics.isl.x3ml_reverse_utils.AssociationTable;

@Path("x3ml")
public class X3MLEndpoint {
    private static final Logger logger = LogManager.getLogger(X3MLEndpoint.class);

    private final Object lock = new Object();

    @Inject
    private X3MLToKnowledgePattern patternGenerator;

    @Inject
    private X3MLTestRunner testRunner;

    @POST()
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MultiPartMediaTypes.MULTIPART_MIXED)
    public Response getResourceInfo(@FormDataParam("mappings") String mappings,
            @FormDataParam("generatorPolicy") InputStream generatorPolicy, @FormDataParam("data") InputStream data) {

        // we need to make sure that we evaluate only one request at a time,
        // because X3ML engine is not thread safe
        synchronized (lock) {
            try {
                X3MLEngine.ENABLE_ASSOCIATION_TABLE = true;
                AssociationTable.clearAssociationTable();

                X3MLEngine engine = X3MLEngine
                        .load(new ByteArrayInputStream(mappings.getBytes(StandardCharsets.UTF_8)));
                X3MLGeneratorPolicy policy = X3MLGeneratorPolicy.load(generatorPolicy,
                        X3MLGeneratorPolicy.createUUIDSource(-1));

                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                javax.xml.parsers.DocumentBuilder documentBuilder = factory.newDocumentBuilder();
                Document document = documentBuilder.parse(data);

                // execute X3ML on the given document
                ByteArrayOutputStream turtleOutput = new ByteArrayOutputStream();
                Output output = engine.execute(document.getDocumentElement(), policy);
                output.write(turtleOutput, "text/turtle");
                output.close();

                // export X3ML xpath to value association table
                StringWriter writer = new StringWriter();
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(writer, AssociationTable.getEntries());

                List<IRI> kps = patternGenerator.generateKnowledgePatterns(
                        documentBuilder.parse(new ByteArrayInputStream(mappings.getBytes("UTF-8"))));

                return Response
                        .ok(new MultiPart().bodyPart(turtleOutput.toString(), new MediaType("text", "turtle"))
                                .bodyPart(writer.toString(), MediaType.APPLICATION_JSON_TYPE).bodyPart(kps,
                                        MediaType.APPLICATION_JSON_TYPE),
                                MultiPartMediaTypes.MULTIPART_MIXED_TYPE)
                        .build();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    @POST
    @Path("/evaluate-xpath")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response evaluateXPath(@FormDataParam("data") InputStream data,
            @FormDataParam("xpaths") List<String> xpaths) {
        try {
            XPathEvaluator evaluator = new XPathEvaluator();
            List<XPathEvaluator.XPathResult> results = evaluator.evaluate(data, xpaths);

            List<Map<String, Object>> resultList = new ArrayList<>();
            for (XPathEvaluator.XPathResult result : results) {
                Map<String, Object> resultMap = new HashMap<>();
                resultMap.put("xpath", result.getXpath());
                resultMap.put("resultType", result.getResultType());
                resultMap.put("text", result.getText());
                resultMap.put("nodeName", result.getNodeName());
                resultMap.put("startLine", result.getStartLine() - 1);
                resultMap.put("startOffset", result.getStartOffset() - 1);
                resultMap.put("endLine", result.getEndLine() - 1);
                resultMap.put("endOffset", result.getEndOffset() - 1);
                resultMap.put("absoluteXPath", result.getAbsoluteXPath());

                resultList.add(resultMap);
            }

            return Response.ok(resultList).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/get-xpath")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_PLAIN)
    public Response getXPathFromPosition(@FormDataParam("data") InputStream data, @FormDataParam("line") int line,
            @FormDataParam("offset") int offset) {
        try {
            // we expect that line and offset are 0 based, but java XML API is 1 based
            String xpath = XPathBuilder.buildXPathFromPosition(data, line + 1, offset + 1);
            return Response.ok(xpath).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/run-tests")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response runTests(JsonNode jsonInput) {
        try {
            String storageId = jsonInput.path("storageId").asText(null);
            String x3mlProjectHrid = jsonInput.path("x3mlProjectHrid").asText(null);
            String x3mlProjectName = jsonInput.path("x3mlProjectName").asText(null);
            Set<String> testIds = new HashSet<>();
            if (jsonInput.has("testIds") && jsonInput.get("testIds").isArray()) {
                jsonInput.get("testIds").forEach(node -> testIds.add(node.asText()));
            }

            List<TestResult> results = this.testRunner.runTestsFromStorage(storageId, x3mlProjectHrid, x3mlProjectName,
                    testIds);
            return Response.ok(results).build();
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }
}
