/**
 * ResearchSpace
 * SPDX-FileCopyrightText: 2024, PHAROS: The International Consortium of Photo Archives
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.services.info;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.LabelCache;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinition;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class QueryProcessor {

        public static final StoragePath INFO_PROFILES = StoragePath.parse("config/resource-info-profiles");


    private int nextNodeId = 0;
    private Map<IRI, FieldDefinition> fields;
    private final FieldDefinitionManager fieldDefinitionManager;
    private final RepositoryManager repositoryManager;
    private final LabelCache labelCache;
    private final PlatformStorage platformStorage;
    private ObjectMapper objectMapper = new ObjectMapper();

    Map<String, FieldNode> profiles;


    public QueryProcessor(FieldDefinitionManager fieldDefinitionManager, RepositoryManager repositoryManager,
            LabelCache labelCache, PlatformStorage platformStorage, CacheManager cacheManager) {
        this.fieldDefinitionManager = fieldDefinitionManager;
        this.repositoryManager = repositoryManager;
        this.labelCache = labelCache;
        this.platformStorage = platformStorage;

        init();
    }


    public void init() {
        this.profiles = new HashMap<>();
        Set<IRI> allFieldIris = new HashSet<>();
        try {
            this.platformStorage.findAll(INFO_PROFILES).forEach((path, result) -> {
                String profileName = path.stripExtension(".json").getLastComponent();
    
                try {
                    FieldNode profile = JsonUtil.getDefaultObjectMapper()
                            .readValue(result.getRecord().getLocation().readContent(), FieldNode.class);
                    assignNodeIds(profile);
                    this.profiles.put(profileName, profile);
                    allFieldIris.addAll(getAllFields(profile));
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
            this.fields = fieldDefinitionManager.queryFieldDefinitions(allFieldIris);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
    
    private Set<IRI> getAllFields(FieldNode node) {
        Set<String> allIRIs = new HashSet<>();
        Queue<FieldNode> queue = new LinkedList<>();
        allIRIs.addAll(node.getFields().keySet());
        queue.addAll(node.getFields().values());
    
        while (!queue.isEmpty()) {
            FieldNode field = queue.poll();
            if (field.getFields() != null) {
                allIRIs.addAll(field.getFields().keySet());
                queue.addAll(field.getFields().values());
            }
        }
    
        return allIRIs.stream().map(SimpleValueFactory.getInstance()::createIRI).collect(Collectors.toSet());
    }
    public String process(IRI iri, String profileName, String repositoryId, String preferredLanguage) {
        FieldNode profile = profiles.get(profileName);
        if (profile == null) {
            throw new IllegalArgumentException("Profile not found: " + profileName);
        }
        
        Repository repository = repositoryManager.getRepository(repositoryId);
        Map<String, String> variables = Collections.singletonMap(profile.getSubject(), iri.stringValue());
        
        ResultNode result = processLevel(repository, profile, variables);
        return this.serializeToJson(result, iri);
    }
    
    private ResultNode processLevel(Repository repository, FieldNode field, Map<String, String> variables) {
        String query = generateQuery(field, variables);
        System.out.println("Query: " + query);
        Map<Integer, List<BindingSet>> results = executeQuery(repository, query);
        return buildResultTree(repository, field, results, variables);
    }
    
    

    private String serializeToJson(ResultNode resultNode, IRI startingIRI) {
        ObjectNode rootObject = objectMapper.createObjectNode();
        rootObject.put("@id", startingIRI.stringValue());

        for (Map.Entry<String, ResultNode> entry : resultNode.getChildren().entrySet()) {
            String fieldUri = entry.getKey();
            ResultNode childNode = entry.getValue();

            ObjectNode fieldObject = objectMapper.createObjectNode();
            fieldObject.put("@id", fieldUri);
            fieldObject.put("label", childNode.getLabel());

            ArrayNode valuesArray = fieldObject.putArray("values");
            for (ResultValue value : childNode.getValues()) {
                ObjectNode valueObject = objectMapper.createObjectNode();
                if (value.isResource()) {
                    valueObject.put("@id", value.getValue());
                    valueObject.put("label", value.getLabel());
                } else {
                    valueObject.put("@value", value.getValue());
                }

                // Add nested fields if any
                for (Map.Entry<String, ResultNode> nestedEntry : childNode.getChildren().entrySet()) {
                    String nestedFieldUri = nestedEntry.getKey();
                    ResultNode nestedNode = nestedEntry.getValue();
                    valueObject.set(nestedFieldUri, objectMapper.valueToTree(serializeResultNode(nestedNode)));
                }

                valuesArray.add(valueObject);
            }

            rootObject.set(fieldUri, fieldObject);
        }

        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(rootObject);
        } catch (Exception e) {
            throw new RuntimeException("Error serializing result to JSON", e);
        }
    }

    private ObjectNode serializeResultNode(ResultNode node) {
        ObjectNode nodeObject = objectMapper.createObjectNode();
        nodeObject.put("@id", node.getFieldUri());
        nodeObject.put("label", node.getLabel());

        ArrayNode valuesArray = nodeObject.putArray("values");
        for (ResultValue value : node.getValues()) {
            ObjectNode valueObject = objectMapper.createObjectNode();
            if (value.isResource()) {
                valueObject.put("@id", value.getValue());
                valueObject.put("label", value.getLabel());
            } else {
                valueObject.put("@value", value.getValue());
            }
            valuesArray.add(valueObject);
        }

        for (Map.Entry<String, ResultNode> entry : node.getChildren().entrySet()) {
            String fieldUri = entry.getKey();
            ResultNode childNode = entry.getValue();
            nodeObject.set(fieldUri, serializeResultNode(childNode));
        }

        return nodeObject;
    }


    private void assignNodeIds(FieldNode node) {
        node.setNodeId(nextNodeId++);
        if (node.getFields() != null) {
            for (FieldNode child : node.getFields().values()) {
                assignNodeIds(child);
            }
        }
    }
    

    private String generateQuery(FieldNode config, Map<String, String> variables) {
        StringBuilder queryBuilder = new StringBuilder();
        Set<String> prefixes = new HashSet<>();
        Set<String> selectVars = new HashSet<>(Arrays.asList("nodeId", "field", "value"));

        queryBuilder.append("SELECT DISTINCT ");
        queryBuilder.append(String.join(" ", selectVars.stream().map(var -> "?" + var).collect(Collectors.toList())));
        queryBuilder.append(" WHERE {\n");

        for (Map.Entry<String, FieldNode> entry : config.getFields().entrySet()) {
            String fieldUri = entry.getKey();
            FieldNode field = entry.getValue();

            queryBuilder.append("  {\n");

            FieldDefinition fieldDef = fields.get(SimpleValueFactory.getInstance().createIRI(fieldUri));
            if (fieldDef != null) {
                String pattern = fieldDef.getSelectPattern();

                // Extract prefixes
                Matcher prefixMatcher = Pattern.compile("PREFIX\\s+\\w+:\\s*<[^>]+>").matcher(pattern);
                while (prefixMatcher.find()) {
                    prefixes.add(prefixMatcher.group());
                }

                // Extract WHERE clause
                int whereIndex = pattern.toLowerCase().indexOf("where");
                if (whereIndex != -1) {
                    pattern = pattern.substring(whereIndex + 5).trim();
                    if (pattern.startsWith("{")) {
                        pattern = pattern.substring(1, pattern.length() - 1).trim();
                    }
                }

                queryBuilder.append("    ").append(pattern).append("\n");
            }

            queryBuilder.append("    BIND(").append(field.getNodeId()).append(" AS ?nodeId)\n");
            queryBuilder.append("    BIND(<").append(fieldUri).append("> AS ?field)\n");
            queryBuilder.append("    VALUES (?").append("subject").append(") { (<")
                    .append(variables.get(config.getSubject())).append(">) }\n");
            queryBuilder.append("  }\n");
            queryBuilder.append("  UNION\n");
        }

        // Remove last UNION
        queryBuilder.setLength(queryBuilder.length() - 8);
        queryBuilder.append("\n}");

        // Add prefixes at the beginning of the query
        StringBuilder finalQueryBuilder = new StringBuilder();
        for (String prefix : prefixes) {
            finalQueryBuilder.append(prefix).append("\n");
        }
        finalQueryBuilder.append("\n").append(queryBuilder);

        return finalQueryBuilder.toString();
    }

    private Map<Integer, List<BindingSet>> executeQuery(Repository repository, String query) {
        Map<Integer, List<BindingSet>> results = new HashMap<>();

        try (RepositoryConnection conn = repository.getConnection()) {
            TupleQuery tupleQuery = conn.prepareTupleQuery(query);
            try (TupleQueryResult result = tupleQuery.evaluate()) {
                while (result.hasNext()) {
                    BindingSet bindingSet = result.next();
                    int nodeId = ((Literal) bindingSet.getValue("nodeId")).intValue();
                    results.computeIfAbsent(nodeId, k -> new ArrayList<>()).add(bindingSet);
                }
            }
        }

        return results;
    }

    private ResultNode buildResultTree(Repository repository, FieldNode config, Map<Integer, List<BindingSet>> results, Map<String, String> variables) {
        ResultNode resultNode = new ResultNode();
        resultNode.setFieldUri(config.getSubject());

        for (Map.Entry<String, FieldNode> entry : config.getFields().entrySet()) {
            String fieldUri = entry.getKey();
            FieldNode field = entry.getValue();

            ResultNode childNode = new ResultNode();
            childNode.setFieldUri(fieldUri);
            childNode.setLabel(field.getLabel());

            List<BindingSet> fieldResults = results.get(field.getNodeId());
            if (fieldResults != null) {
                for (BindingSet bindingSet : fieldResults) {
                    Value value = bindingSet.getValue("value");
                    ResultValue resultValue = new ResultValue(value.stringValue(), value instanceof IRI);
                    childNode.getValues().add(resultValue);
                }
            }

            if (field.getFields() != null) {
                Map<String, String> newVariables = new HashMap<>(variables);
                if (field.getReturns() != null) {
                    for (VariableMapping mapping : field.getReturns()) {
                        newVariables.put(mapping.getLocalVar(), childNode.getValues().get(0).getValue());
                    }
                }
                ResultNode nestedResult = processLevel(repository, field, newVariables);  // Use field directly
                childNode.setChildren(nestedResult.getChildren());
            }

            resultNode.getChildren().put(fieldUri, childNode);
        }

        // Fetch and add labels
        Set<IRI> iris = collectIRIs(resultNode);
        Map<IRI, Optional<Literal>> labels = labelCache.getLabels(iris, repository, null);
        addLabels(resultNode, labels);

        return resultNode;
    }

    private Set<IRI> collectIRIs(ResultNode node) {
        Set<IRI> iris = new HashSet<>();
        if (node.getFieldUri() != null) {
            iris.add(SimpleValueFactory.getInstance().createIRI(node.getFieldUri()));
        }
        for (ResultValue value : node.getValues()) {
            if (value.isResource()) {
                iris.add(SimpleValueFactory.getInstance().createIRI(value.getValue()));
            }
        }
        for (ResultNode child : node.getChildren().values()) {
            iris.addAll(collectIRIs(child));
        }
        return iris;
    }

    private void addLabels(ResultNode node, Map<IRI, Optional<Literal>> labels) {
        if (node.getFieldUri() != null) {
            node.setLabel(getLabelForIri(node.getFieldUri(), labels));
        }
        for (ResultValue value : node.getValues()) {
            if (value.isResource()) {
                value.setLabel(getLabelForIri(value.getValue(), labels));
            }
        }
        for (ResultNode child : node.getChildren().values()) {
            addLabels(child, labels);
        }
    }

    private String getLabelForIri(String iri, Map<IRI, Optional<Literal>> labels) {
        IRI iriObj = SimpleValueFactory.getInstance().createIRI(iri);
        return labels.getOrDefault(iriObj, Optional.empty())
                .map(Literal::stringValue)
                .orElse(iriObj.getLocalName());
    }


    public static class FieldNode {
        private String subject;
        private List<VariableMapping> returns;
        private String label;
        private Map<String, FieldNode> fields;
        private List<VariableMapping> params;
        private int nodeId;
    
        public String getSubject() {
            return subject;
        }

        public void setSubject(String subject) {
            this.subject = subject;
        }

        public List<VariableMapping> getReturns() {
            return returns;
        }

        public void setReturns(List<VariableMapping> returns) {
            this.returns = returns;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Map<String, FieldNode> getFields() {
            return fields;
        }

        public void setFields(Map<String, FieldNode> fields) {
            this.fields = fields;
        }

        public List<VariableMapping> getParams() {
            return params;
        }

        public void setParams(List<VariableMapping> params) {
            this.params = params;
        }

        public int getNodeId() {
            return nodeId;
        }

        public void setNodeId(int nodeId) {
            this.nodeId = nodeId;
        }
    }

    public static class VariableMapping {
        private String sparqlVar;
        private String localVar;

        public String getSparqlVar() {
            return sparqlVar;
        }

        @JsonProperty("sparql_var")
        public void setSparqlVar(String sparqlVar) {
            this.sparqlVar = sparqlVar;
        }

        public String getLocalVar() {
            return localVar;
        }

        @JsonProperty("local_var")
        public void setLocalVar(String localVar) {
            this.localVar = localVar;
        }
    }

    public static class ResultNode {
        private String fieldUri;
        private String label;
        private List<ResultValue> values = new ArrayList<>();
        private Map<String, ResultNode> children = new HashMap<>();

        public String getFieldUri() {
            return fieldUri;
        }

        public void setFieldUri(String fieldUri) {
            this.fieldUri = fieldUri;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public List<ResultValue> getValues() {
            return values;
        }

        public void setValues(List<ResultValue> values) {
            this.values = values;
        }

        public Map<String, ResultNode> getChildren() {
            return children;
        }

        public void setChildren(Map<String, ResultNode> children) {
            this.children = children;
        }
    }

    public static class ResultValue {
        private String value;
        private String label;
        private boolean isResource;

        public ResultValue(String value, boolean isResource) {
            this.value = value;
            this.isResource = isResource;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public boolean isResource() {
            return isResource;
        }

        public void setResource(boolean resource) {
            isResource = resource;
        }
    }
}
