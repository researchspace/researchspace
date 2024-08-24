package org.researchspace.x3ml;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;
import org.researchspace.x3ml.TestCaseConfig.MappingItem;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;

import gr.forth.ics.isl.x3ml.X3MLEngine;
import gr.forth.ics.isl.x3ml.X3MLGeneratorPolicy;
import gr.forth.ics.isl.x3ml.X3MLEngine.Output;

@Singleton
public class X3MLTestRunner {

    @Inject
    private PlatformStorage platformStorage;

    private static final Object LOCK = new Object();
    private static final String X3MS_TESTS_STORAGE = "x3ml-tests";

    public static InputStream getInputStreamFromDocument(Document document) {
        try {
            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            StringWriter writer = new StringWriter();
            transformerFactory.newTransformer().transform(new DOMSource(document), new StreamResult(writer));
            return new ByteArrayInputStream(writer.toString().getBytes());
        } catch (Exception e) {
            throw ExceptionUtils.<RuntimeException>rethrow(e);
        }
    }

    private DocumentBuilderFactory factory;

    public List<TestResult> runTestsFromStorage(String storageId, String x3mlProjectId, String x3mlProjectName,
            Set<String> testIds) {
        InputStream generatorPolicy = new ByteArrayInputStream(fetchGeneratorPolicy(x3mlProjectId).getBytes());
        InputStream x3mlMappings = new ByteArrayInputStream(fetchX3MLMappings(x3mlProjectId).getBytes());

        try {
            Document mappings = this.factory.newDocumentBuilder().parse(x3mlMappings);
            X3MLGeneratorPolicy policy = X3MLGeneratorPolicy.load(generatorPolicy,
                    X3MLGeneratorPolicy.createUUIDSource(-1));

            Map<String, TestCase> testCases = new HashMap<>();
            ObjectStorage storage = this.platformStorage.getStorage(storageId);
            storage.getAllObjects(StoragePath.EMPTY).forEach(record -> {
                try {
                    StoragePath objectPath = record.getPath();
                    if (objectPath.toString().startsWith(x3mlProjectName + "/")) {
                        String fileName = objectPath.getLastComponent();
                        String testId = StoragePath.removeAnyExtension(fileName);

                        if (testIds.isEmpty() || testIds.contains(testId)) {
                            TestCase testCase = testCases.computeIfAbsent(testId, k -> new TestCase(null, null, null));
                            InputStream inputStream = record.getLocation().readContent();
                            if (fileName.endsWith(".xml")) {
                                testCase.setInputXml(inputStream);
                            } else if (fileName.endsWith(".ttl")) {
                                testCase.setExpectedRdf(inputStream);
                            } else if (fileName.endsWith(".yaml")) {
                                TestCaseConfig config = parseYamlConfig(inputStream);
                                testCase.setConfig(config);
                            }
                        }
                    }
                } catch (Exception e) {
                    throw ExceptionUtils.<RuntimeException>rethrow(e);
                }
            });

            return evaluateTests(mappings, policy, testCases.values());
        } catch (Exception e) {
            throw ExceptionUtils.<RuntimeException>rethrow(e);
        }
    }

    private TestCaseConfig parseYamlConfig(InputStream configYaml) {
        ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
        try {
            return mapper.readValue(configYaml, TestCaseConfig.class);
        } catch (IOException e) {
            throw new RuntimeException("Error parsing YAML config", e);
        }
    }

    private String fetchFrom3m(String baseUrl, String path, String x3mlProjectHrid, String fieldName) {
    Client client = ClientBuilder.newClient();
    
    WebTarget target = client.target(baseUrl).path(path).path(x3mlProjectHrid);
    try {
        Response response = target.request(MediaType.APPLICATION_JSON)
            .header("Authorization", "")
            .get();
        
        if (response.getStatus() == Response.Status.OK.getStatusCode()) {
            JsonNode jsonNode = response.readEntity(JsonNode.class);
            if (jsonNode.get("succeed").asBoolean()) {
                return jsonNode.get(fieldName).asText();
            } else {
                throw new RuntimeException("3M endpoint failed. Message: " + jsonNode.get("msg").asText());
            }
        } else {
            throw new RuntimeException("HTTP request failed. Response Code: " + response.getStatus());
        }
    } catch (Exception e) {
        throw ExceptionUtils.<RuntimeException>rethrow(e);
    } finally {
        client.close();
    }
}


    public String fetchGeneratorPolicy(String x3mlProjectHrid) {
        return fetchFrom3m("https://mapper.artresearch.net/3m/x3ml",
                "constructAndDownloadGeneratorPolicyFileByMappingProjectHrid", x3mlProjectHrid, "generatorPolicy");
    }

    public String fetchX3MLMappings(String x3mlProjectHrid) {
        return fetchFrom3m("https://mapper.artresearch.net/3m/x3ml", "convertAndsaveX3mlByMappingProjectHrid",
                x3mlProjectHrid + "/true", "x3ml");
    }

    public List<TestResult> evaluateTests(Document mappings, X3MLGeneratorPolicy policy, Collection<TestCase> tests) {
        Map<String, List<TestCase>> groupedTests = tests.stream()
                .collect(Collectors.groupingBy(testCase -> testCase.getConfig().getProjectIdAndLinks()));

        return groupedTests.entrySet().stream().map(entry -> processGroup(mappings, policy, entry.getValue()))
                .flatMap(List::stream).collect(Collectors.toList());
    }

    private List<TestResult> processGroup(Document mappings, X3MLGeneratorPolicy policy, List<TestCase> tests) {
        TestCase test = tests.get(0);
        Document filteredMappings = this.filterMappings(mappings, test.getConfig().getMapping(), true);

        // we need to make sure that we evaluate only one request at a time,
        // because X3MLEngine is not thread safe
        synchronized (LOCK) {
            X3MLEngine engine = X3MLEngine.load(getInputStreamFromDocument(filteredMappings));
            return tests.stream().map(t -> {
                return runTestCase(engine, policy, t);
            }).collect(Collectors.toList());
        }
    }

    private TestResult runTestCase(X3MLEngine engine, X3MLGeneratorPolicy policy, TestCase test) {
        try {
            Output output = engine.execute(getInputRoot(test.getInputXml()), policy);
            String errors = X3MLEngine.exceptionMessagesList;

            Model outputRdf = output.getModel();
            Model expectedRdf = ModelFactory.createDefaultModel();
            try (InputStream expected = test.getExpectedRdf()) {
                RDFDataMgr.read(expectedRdf, expected, Lang.TURTLE);
            }

            boolean isEqual = outputRdf.isIsomorphicWith(expectedRdf);
            TestResult result = new TestResult(isEqual, test.getConfig().getTestId());
            if (errors != null && !errors.isEmpty()) {
                result.setX3mlErrors(errors);
            }

            if (!isEqual) {
                StringWriter addedWriter = new StringWriter();
                outputRdf.difference(expectedRdf).write(addedWriter, "TURTLE");

                StringWriter removedWriter = new StringWriter();
                expectedRdf.difference(outputRdf).write(removedWriter, "TURTLE");

                result.setDiff(addedWriter.toString(), removedWriter.toString());
            }
            return result;
        } catch (Exception e) {
            TestResult result = new TestResult(false, test.getConfig().getTestId());
            result.setExceptions(ExceptionUtils.getStackTrace(e));
            return result;
        }
    }

    public Element getInputRoot(InputStream data) {
        try {
            DocumentBuilder documentBuilder = this.factory.newDocumentBuilder();
            return documentBuilder.parse(data).getDocumentElement();
        } catch (Exception e) {
            throw ExceptionUtils.<RuntimeException>rethrow(e);
        }
    }

    private Document filterMappings(Document allMappings, List<MappingItem> mappingsToFilter, boolean skipDomain) {
        Document doc = (Document) allMappings.cloneNode(true);

        Map<String, List<String>> mappingMap = new HashMap<>();
        for (MappingItem item : mappingsToFilter) {
            mappingMap.put(item.getId(), item.getLinks());
        }

        NodeList mappings = doc.getElementsByTagName("mapping");
        for (int i = mappings.getLength() - 1; i >= 0; i--) {
            Element mapping = (Element) mappings.item(i);
            NodeList comments = mapping.getElementsByTagName("comment");

            if (comments.getLength() > 0) {
                Element firstComment = (Element) comments.item(0);
                NodeList rationales = firstComment.getElementsByTagName("rationale");

                if (rationales.getLength() > 0) {
                    String rationale = rationales.item(0).getTextContent();

                    if (mappingMap.containsKey(rationale)) {
                        List<String> allowedLinks = mappingMap.get(rationale);
                        if (allowedLinks.isEmpty()) {
                            continue;
                        }

                        if (skipDomain) {
                            NodeList domains = mapping.getElementsByTagName("domain");
                            if (domains.getLength() > 0) {
                                Element domain = (Element) domains.item(0);
                                NodeList entities = domain.getElementsByTagName("entity");
                                if (entities.getLength() > 0) {
                                    Element entity = (Element) entities.item(0);

                                    // Remove label_generator
                                    NodeList labelGenerators = entity.getElementsByTagName("label_generator");
                                    if (labelGenerators.getLength() > 0) {
                                        entity.removeChild(labelGenerators.item(0));
                                    }

                                    // Remove additional elements
                                    NodeList additionals = entity.getElementsByTagName("additional");
                                    while (additionals.getLength() > 0) {
                                        entity.removeChild(additionals.item(0));
                                    }
                                }
                            }
                        }

                        NodeList links = mapping.getElementsByTagName("link");
                        for (int j = links.getLength() - 1; j >= 0; j--) {
                            Element link = (Element) links.item(j);
                            NodeList linkComments = link.getElementsByTagName("comment");

                            if (linkComments.getLength() > 0) {
                                Element firstLinkComment = (Element) linkComments.item(0);
                                NodeList linkRationales = firstLinkComment.getElementsByTagName("rationale");

                                if (linkRationales.getLength() > 0) {
                                    // we consider a text up to a first . as a link identifier
                                    // e.g in a5202_en_2. Bauwerkname (EN), translation of
                                    // a5202_en_2 is a link identifier
                                    String linkRationale = linkRationales.item(0).getTextContent().split("\\.")[0];

                                    if (!allowedLinks.contains(linkRationale)) {
                                        mapping.removeChild(link);
                                    }
                                }
                            } else {
                                mapping.removeChild(link);
                            }
                        }
                    } else {
                        mapping.getParentNode().removeChild(mapping);
                    }
                }
            }
        }

        return doc;
    }

    public X3MLTestRunner() {
        this.factory = DocumentBuilderFactory.newInstance();
        this.factory.setIgnoringComments(true);
        // by default dom is parsed in a lazy manner, which does make sense for large
        // file
        // but in our case we are working with many small file and it is more efficient
        // to process them in eagerly
        try {
            this.factory.setFeature("http://apache.org/xml/features/dom/defer-node-expansion", false);
        } catch (ParserConfigurationException e) {
            throw new RuntimeException(e);
        }
    }

    public Model runX3ML(InputStream data) {
        try {
            DocumentBuilder documentBuilder = this.factory.newDocumentBuilder();
            // Output output =
            // this.engine.execute(documentBuilder.parse(data).getDocumentElement(),
            // this.policy);
            // return output.getModel();
            return null;
        } catch (Exception e) {
            throw ExceptionUtils.<RuntimeException>rethrow(e);
        }
    }
}
