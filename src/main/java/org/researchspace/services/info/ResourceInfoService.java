/**
 * ResearchSpace
 * SPDX-FileCopyrightText: 2024, PHAROS: The International Consortium of Photo Archives
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.services.info;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.algebra.Namespace;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.LabelCache;
import org.researchspace.cache.PlatformCache;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinition;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.inject.Inject;

public class ResourceInfoService implements PlatformCache {

    private static final Logger logger = LogManager.getLogger(ResourceInfoService.class);


    private static final int MAX_RECURSION_DEPTH = 10000;
    public static final StoragePath INFO_PROFILES = StoragePath.parse("config/resource-info-profiles");

    private final FieldDefinitionManager fieldDefinitionManager;
    private final RepositoryManager repositoryManager;
    private final LabelCache labelCache;
    private final PlatformStorage platformStorage;
    private final NamespaceRegistry namespaceRegistry;

    private Map<String, ResourceInfoProfile> profiles;
    private Map<IRI, FieldDefinition> fields;
    private Map<IRI, String> extractedPatterns;

    private String cachedPrefixes;
    private Map<String, String> uniquePrefixes;
    private Pattern prefixPattern = Pattern.compile("PREFIX\\s+(\\w+):\\s*<([^>]+)>", Pattern.CASE_INSENSITIVE);
    private static final Pattern IMPLICIT_PREFIX_PATTERN = Pattern.compile("\\b((?!http|https)[a-zA-Z_][a-zA-Z0-9_.-]*):(?=[a-zA-Z_])");

    @Inject
    public ResourceInfoService(FieldDefinitionManager fieldDefinitionManager, RepositoryManager repositoryManager,
            LabelCache labelCache, CacheManager cacheManager, PlatformStorage platformStorage, NamespaceRegistry namespaceRegistry) {

        this.fieldDefinitionManager = fieldDefinitionManager;
        this.repositoryManager = repositoryManager;
        this.labelCache = labelCache;
        this.platformStorage = platformStorage;
        this.namespaceRegistry = namespaceRegistry;
        this.init();
        cacheManager.register(this);
    }

    private void init() {
        this.profiles = new HashMap<>();
        Set<IRI> allFieldIris = new HashSet<>();
        this.uniquePrefixes = new HashMap<>();

        // Load profiles from storage
        try {
            this.platformStorage.findAll(INFO_PROFILES).forEach((path, result) -> {
                String profileName = path.stripExtension(".json").getLastComponent();
                try {
                    ResourceInfoProfile profile = JsonUtil.getDefaultObjectMapper()
                            .readValue(result.getRecord().getLocation().readContent(), ResourceInfoProfile.class);
                    this.profiles.put(profileName, profile);
                    allFieldIris.addAll(profile.getAllFields());
                    if (profile.getProvenance() != null) {
                        allFieldIris.addAll(profile.getProvenance().getAllFields());
                    }
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        // Query field definitions
        this.fields = fieldDefinitionManager.queryFieldDefinitions(allFieldIris);

        // Extract unique prefixes from all field patterns
        for (FieldDefinition fieldDef : this.fields.values()) {
            String pattern = fieldDef.getSelectPattern();
            extractPrefixes(pattern);
            extractImplicitPrefixesFromQuery(pattern); // New call
        }

        // Build the cached prefixes string
        StringBuilder prefixBuilder = new StringBuilder();
        for (Map.Entry<String, String> entry : this.uniquePrefixes.entrySet()) {
            prefixBuilder.append("PREFIX ").append(entry.getKey()).append(": <").append(entry.getValue()).append(">\n");
        }
        this.cachedPrefixes = prefixBuilder.toString();

        this.extractedPatterns = new HashMap<>();
        for (Map.Entry<IRI, FieldDefinition> entry : this.fields.entrySet()) {
            IRI fieldIri = entry.getKey();
            FieldDefinition fieldDef = entry.getValue();
            String pattern = extractWhereClause(fieldDef.getSelectPattern());
            pattern = pattern.concat("\n BIND(<" + fieldIri.stringValue() + "> AS ?field) \n");
            this.extractedPatterns.put(fieldIri, pattern);
        }
    }

    @Override
    public void invalidate() {
        this.init();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        this.invalidate();
    }

    @Override
    public String getId() {
        return "ResourceInfoService";
    }

    private String extractWhereClause(String selectPattern) {
        int whereIndex = selectPattern.toLowerCase().indexOf("where");
        if (whereIndex != -1) {
            String pattern = selectPattern.substring(whereIndex + 5).trim();
            if (pattern.startsWith("{")) {
                pattern = pattern.substring(1, pattern.length() - 1).trim();
            }
            return pattern;
        } else {
            throw new RuntimeException("No WHERE clause found in pattern, " + selectPattern);
        }
    }

    private void extractPrefixes(String pattern) {
        Matcher matcher = prefixPattern.matcher(pattern);
        while (matcher.find()) {
            this.uniquePrefixes.put(matcher.group(1), matcher.group(2));
        }
    }

    private void extractImplicitPrefixesFromQuery(String queryPart) {
        Matcher matcher = IMPLICIT_PREFIX_PATTERN.matcher(queryPart);

        while (matcher.find()) {
            String prefix = matcher.group(1);

            if (this.uniquePrefixes.containsKey(prefix)) {
                continue;
            }

            Optional<String> namespaceIRI = this.namespaceRegistry.getNamespace(prefix);
            if (namespaceIRI.isPresent()) {
                this.uniquePrefixes.put(prefix, namespaceIRI.get());
                if (logger.isTraceEnabled()) {
                    logger.trace("Discovered and registered implicit prefix: {} -> {}", prefix, namespaceIRI.get());
                }
            }
        }
    }

    public String getResourceInfo(IRI iri, String profileName, String repositoryId, String preferredLanguage) {
        if (logger.isTraceEnabled()) {
            logger.trace("getResourceInfo called with IRI: {}, profileName: {}, repositoryId: {}, preferredLanguage: {}", 
                        iri.stringValue(), profileName, repositoryId, preferredLanguage);
        }
        
        try {
            ResourceInfoProfile profile = this.profiles.get(profileName);
            if (profile == null) {
                if (logger.isTraceEnabled()) {
                    logger.trace("Profile not found: {}", profileName);
                    logger.trace("Available profiles: {}", this.profiles.keySet());
                }
                return "";
            }
            
            if (logger.isTraceEnabled()) {
                logger.trace("Profile subject: {}", profile.getSubject());
                logger.trace("Profile has provenance: {}", (profile.getProvenance() != null));
            }
            
            Repository repo = this.repositoryManager.getRepository(repositoryId);
    
            Context initialContext = new Context();
            initialContext.addVariable(profile.getSubject(), iri);
            if (logger.isTraceEnabled()) {
                logger.trace("Initial context: {}", initialContext);
            }
    
            List<BindingSet> allBindings = processProfile(profile, repo, preferredLanguage, initialContext);
    
            String result = buildFinalJson(iri, allBindings, repo, preferredLanguage);
            
  //          long executionTime = System.currentTimeMillis() - startTime;
  //          logger.trace("ResourceInfo for: {} executed in {}ms for IRI: {}", iri.stringValue(), executionTime, iri);
            
            return result;
        } catch (Exception e) {
    //        long executionTime = System.currentTimeMillis() - startTime;
    //        logger.trace("getResourceInfo failed in {}ms for IRI: {}: {}", executionTime, iri, e.getMessage());
                e.printStackTrace();
                logger.trace("getResourceInfo failed for IRI: {}: {}", iri, e.getMessage());
                return "";
        }
    }
    

    private List<BindingSet> processProfile(ResourceInfoProfile profile, Repository repo, String preferredLanguage,
            Context initialContext) {
        if (logger.isTraceEnabled()) {
            logger.trace("Processing profile with subject: {}", profile.getSubject());
            logger.trace("Profile fields count: {}", (profile.getFields() != null ? profile.getFields().size() : 0));
        }
        
        List<BindingSet> allBindings = new ArrayList<>();
        Map<Integer, ResourceInfoProfileField> nodeMap = new HashMap<>();
        int lastId = assignNodeIds(profile.getFields(), nodeMap, 0);
        if (logger.isTraceEnabled()) {
            logger.trace("Assigned {} nodeIds", nodeMap.size());

            // Log field structure
            logger.trace("Field structure:");
            for (Map.Entry<Integer, ResourceInfoProfileField> entry : nodeMap.entrySet()) {
                ResourceInfoProfileField field = entry.getValue();
                logger.trace("Field {} has returns: {}", 
                            field.getFieldIri(), 
                            (field.getReturns() != null ? field.getReturns().size() : "null"));
                if (field.getReturns() != null) {
                    for (ResourceInfoInputMapping mapping : field.getReturns()) {
                        logger.trace("Return mapping - localVar: {}, sparqlVar: {}", 
                                    mapping.getLocalVar(), mapping.getSparqlVar());
                    }
                }
            }
        }

        List<List<ResourceInfoProfileField>> levels = groupFieldsByLevel(nodeMap);

        Context context = initialContext;

        if (logger.isTraceEnabled()) {
            logger.trace("Grouped fields into {} levels", levels.size());
            for (int i = 0; i < levels.size(); i++) {
                logger.trace("Level {} has {} fields", i, levels.get(i).size());
            }
        }

        for (List<ResourceInfoProfileField> level : levels) {
            if (logger.isTraceEnabled()) {
                logger.trace("Building query for level with {} fields", level.size());
                for (ResourceInfoProfileField field : level) {
                    logger.trace("Level includes field: {}", field.getFieldIri());
                }
            }
            
            String query = buildLevelQuery(level, context, nodeMap, false);
            if (logger.isTraceEnabled()) {
                logger.trace("Executing query: \n{}", query);
            }
            List<BindingSet> levelBindings = executeQuery(repo, query);
            allBindings.addAll(levelBindings);
            context = updateContext(context, levelBindings, nodeMap);
        }

        // Process provenance fields
        if (profile.getProvenance() != null && profile.getProvenance().getFields() != null
                && !profile.getProvenance().getFields().isEmpty()) {
            Set<IRI> provenanceIris = extractProvenanceIris(allBindings);
            Context provenanceContext = new Context();
            provenanceContext.addVariable("provUri", provenanceIris);

            Map<Integer, ResourceInfoProfileField> provenanceNodeMap = new HashMap<>();
            assignNodeIds(profile.getProvenance().getFields(), provenanceNodeMap, lastId);

            List<List<ResourceInfoProfileField>> provLevels = groupFieldsByLevel(provenanceNodeMap);

            for (List<ResourceInfoProfileField> level : provLevels) {
                String query = buildLevelQuery(level, provenanceContext, provenanceNodeMap, true); // Pass a flag
                                                                                                   // indicating this is
                                                                                                   // for provenance
                if (logger.isTraceEnabled()) {
                    logger.trace("Executing provenance query: \n{}", query);
                }
                List<BindingSet> levelBindings = executeQuery(repo, query);
                allBindings.addAll(levelBindings);
                provenanceContext = updateContext(provenanceContext, levelBindings, provenanceNodeMap);
            }
        }

        return allBindings;
    }

    private int assignNodeIds(Map<IRI, ResourceInfoProfileField> fields, Map<Integer, ResourceInfoProfileField> nodeMap,
            int currentId) {
        for (ResourceInfoProfileField field : fields.values()) {
            nodeMap.put(currentId, field);
            if (logger.isTraceEnabled()) {
                logger.trace("Added nodeId: {} to nodeMap for field: {}", currentId, field.getFieldIri());
            }
            currentId++;

            if (field.getFields() != null) {
                currentId = assignNodeIds(field.getFields(), nodeMap, currentId);
            }
        }
        return currentId;
    }

    private List<List<ResourceInfoProfileField>> groupFieldsByLevel(Map<Integer, ResourceInfoProfileField> nodeMap) {
        List<List<ResourceInfoProfileField>> levels = new ArrayList<>();
        Map<ResourceInfoProfileField, Integer> depthMap = new HashMap<>();

        for (ResourceInfoProfileField field : nodeMap.values()) {
            int depth = getFieldDepth(field, nodeMap);
            depthMap.put(field, depth);

            while (levels.size() <= depth) {
                levels.add(new ArrayList<>());
            }
            levels.get(depth).add(field);
        }

        return levels;
    }

    private String buildLevelQuery(List<ResourceInfoProfileField> fieldsForLevel, Context context,
            Map<Integer, ResourceInfoProfileField> nodeMap, boolean isProvenanceQuery) {
        if (logger.isTraceEnabled()) {
            logger.trace("Building {} query for {} fields", 
                        (isProvenanceQuery ? "provenance" : "regular"), fieldsForLevel.size());
        }
        
        StringBuilder queryBuilder = new StringBuilder();

        queryBuilder.append(this.cachedPrefixes).append("\n");

        if (!isProvenanceQuery) {
            boolean anyFieldInLevelEnablesProvenance = false;
            for (ResourceInfoProfileField fieldFromLevelList : fieldsForLevel) {
                if (fieldFromLevelList.isEnableProvenance()) {
                    anyFieldInLevelEnablesProvenance = true;
                    break;
                }
            }

            if (anyFieldInLevelEnablesProvenance) {
                queryBuilder.append("SELECT DISTINCT ?config_node ?field ?value ?subject ?provUri WHERE {\n");
            } else {
                queryBuilder.append("SELECT DISTINCT ?config_node ?field ?value ?subject WHERE {\n");
            }
        } else { // Building query for the provenance block
            queryBuilder.append("SELECT DISTINCT ?config_node ?field ?value ?subject WHERE {\n");
        }

        int fieldsWithSubjects = 0;
        boolean firstUnion = true;
        for (Map.Entry<Integer, ResourceInfoProfileField> entry : nodeMap.entrySet()) {
            Integer nodeId = entry.getKey();
            ResourceInfoProfileField field = entry.getValue(); // This is the field instance from nodeMap

            boolean hasSubject = context.hasSubjectFor(field.getSubject());
            // Check if the field from nodeMap (which is the comprehensive one) is part of the current level's list
            boolean containsField = fieldsForLevel.contains(field); 
            
            if (logger.isTraceEnabled()) {
                logger.trace("Field {} - in fields list for current level: {}, has subject: {} (subject: {})", 
                            field.getFieldIri(), containsField, hasSubject, field.getSubject());
            }
            
            if (containsField && hasSubject) {
                fieldsWithSubjects++;
                if (!firstUnion) {
                    queryBuilder.append("UNION\n");
                }
                firstUnion = false;

                queryBuilder.append("{\n");
                appendFieldPattern(queryBuilder, field, context, isProvenanceQuery);
                queryBuilder.append("BIND(").append(nodeId).append(" AS ?config_node)\n");
                if (logger.isTraceEnabled()) {
                    logger.trace("Adding nodeId: {} to query for field: {}", nodeId, field.getFieldIri());
                }
                queryBuilder.append("}\n");
            }
        }

        queryBuilder.append("}");
        
        if (logger.isTraceEnabled()) {
            logger.trace("Query includes {} fields with subjects out of {} total fields for this level", 
                        fieldsWithSubjects, fieldsForLevel.size());
        }
        
        return queryBuilder.toString();
    }

    private void appendFieldPattern(StringBuilder queryBuilder, ResourceInfoProfileField field, Context context,
            boolean isProvenanceQuery) {
        String pattern = this.extractedPatterns.get(field.getFieldIri());
        if (pattern != null) {
            queryBuilder.append(generateValuesClause(field, context)).append("\n");
            queryBuilder.append(pattern).append("\n");
            // If this is NOT a query for the provenance block itself (isProvenanceQuery == false)
            // AND the current field is configured to enable provenance linking (field.isEnableProvenance())
            // AND the pattern doesn't already explicitly bind ?provUri
            if (!isProvenanceQuery && field.isEnableProvenance() && !hasExplicitProvenanceBinding(pattern)) {
                queryBuilder.append(generateProvenanceBind(pattern)).append("\n");
            }
        }
    }

    private boolean hasExplicitProvenanceBinding(String pattern) {
        return pattern.contains("?provUri");
    }

    private String generateProvenanceBind(String pattern) {
        String[] lines = pattern.split("\n");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("FILTER") || line.startsWith("BIND")) {
                continue;
            }

            // Remove the trailing dot if it exists
            if (line.endsWith(".")) {
                line = line.substring(0, line.length() - 1);
            }

            String[] parts = line.split("\\s+");
            if (parts.length < 3) {
                continue;
            }

            String subject = parts[0];
            String predicate = parts[1];
            String object = parts[parts.length - 1]; // Last part, in case there are more than 3 parts

            // Remove any trailing dot from the object
            if (object.endsWith(".")) {
                object = object.substring(0, object.length() - 1);
            }

            // Check if this line contains ?value in subject or object position
            if (subject.equals("?value") || object.equals("?value")) {
                String otherVar = subject.equals("?value") ? object : subject;

                // Resolve predicate if it's a prefixed URI
                if (!predicate.startsWith("<")) {
                    String[] prefixParts = predicate.split(":");
                    String fullURI = this.uniquePrefixes.get(prefixParts[0]) + prefixParts[1];
                    predicate = fullURI;
                } else {
                    predicate = predicate.substring(1, predicate.length() - 1);
                }

                return String.format(
                        "BIND(IRI(CONCAT(\"http://artresearch.net/resource/e13/\", SHA256(CONCAT(STR(%s), \"%s\", STR(?value))))) AS ?provUri)\n",
                        otherVar, predicate);
            }
        }

        // If no suitable pattern is found, return an empty string or throw an exception
        return "";
        // Alternatively: throw new RuntimeException("No suitable pattern found for
        // provenance binding");
    }

    private int getFieldDepth(ResourceInfoProfileField field, Map<Integer, ResourceInfoProfileField> nodeMap) {
        int depth = 0;
        ResourceInfoProfileField parent = field;
        while ((parent = findParent(parent, nodeMap)) != null) {
            depth++;
        }
        return depth;
    }

    private ResourceInfoProfileField findParent(ResourceInfoProfileField field,
            Map<Integer, ResourceInfoProfileField> nodeMap) {
        for (ResourceInfoProfileField potentialParent : nodeMap.values()) {
            if (potentialParent.getFields() != null && potentialParent.getFields().containsValue(field)) {
                return potentialParent;
            }
        }
        return null;
    }

    private String generateValuesClause(ResourceInfoProfileField field, Context context) {
        List<String> sparqlVars = new ArrayList<>();
        List<String> localVars = new ArrayList<>();
        List<String> constantSparqlVars = new ArrayList<>();
        List<Value> constantValues = new ArrayList<>();

        // Add subject
        sparqlVars.add("subject");
        localVars.add(field.getSubject());

        // Add params, separating constants and non-constants
        if (field.getParams() != null) {
            for (ResourceInfoInputMapping param : field.getParams()) {
                if (param.getConstant() != null) {
                    constantSparqlVars.add(param.getSparqlVar());
                    constantValues.add(SimpleValueFactory.getInstance().createIRI(param.getConstant()));
                } else {
                    sparqlVars.add(param.getSparqlVar());
                    localVars.add(param.getLocalVar());
                }
            }
        }

        List<Map<String, Value>> combinations = context.getCombinations(localVars);
        if (combinations.isEmpty()) {
            return "";
        }

        StringBuilder valuesClause = new StringBuilder("VALUES (");
        // Add non-constant vars
        for (String var : sparqlVars) {
            valuesClause.append("?").append(var).append(" ");
        }
        // Add constant vars
        for (String var : constantSparqlVars) {
            valuesClause.append("?").append(var).append(" ");
        }
        valuesClause.append(") {\n");

        for (Map<String, Value> combination : combinations) {
            valuesClause.append("  (");
            // Add values for non-constant vars
            for (int i = 0; i < sparqlVars.size(); i++) {
                Value value = combination.get(localVars.get(i));
                valuesClause.append(formatValue(value)).append(" ");
            }
            // Add constant values
            for (Value constantValue : constantValues) {
                valuesClause.append(formatValue(constantValue)).append(" ");
            }
            valuesClause.append(")\n");
        }

        valuesClause.append("}");
        return valuesClause.toString();
    }

    private String formatValue(Value value) {
        return value instanceof IRI ? "<" + value.stringValue() + ">" : value.stringValue();
    }

    private List<BindingSet> executeQuery(Repository repo, String query) {
        try (RepositoryConnection conn = repo.getConnection()) {
            long startTime = System.currentTimeMillis();
            List<BindingSet> results = QueryResults.asList(conn.prepareTupleQuery(query).evaluate());
            long executionTime = System.currentTimeMillis() - startTime;
            
            if (logger.isTraceEnabled()) {
                logger.trace("Query executed in {}ms and returned {} results", executionTime, results.size());
                
                if (!results.isEmpty()) {
                    logger.trace("Sample result binding names: {}", results.get(0).getBindingNames());
                    logger.trace("Sample result values: {}", results.get(0));
                    
                    // Log the first few results in more detail
                    int resultsToPrint = Math.min(results.size(), 3);
                    for (int i = 0; i < resultsToPrint; i++) {
                        BindingSet binding = results.get(i);
                        logger.trace("Result {}:", i);
                        for (String name : binding.getBindingNames()) {
                            logger.trace("  {} = {}", name, binding.getValue(name));
                        }
                    }
                } else {
                    logger.trace("Query returned no results");
                }
            }
            
            return results;
        }
    }

    private Context updateContext(Context oldContext, List<BindingSet> bindings,
            Map<Integer, ResourceInfoProfileField> nodeMap) {
        Context newContext = new Context(oldContext);
        for (BindingSet binding : bindings) {
            // Check if binding has the required values before proceeding
            if (!binding.hasBinding("config_node")) {
                if (logger.isTraceEnabled()) {
                    logger.trace("Binding does not have config_node, skipping");
                }
                continue;
            }
            
            int configNode = ((Literal) binding.getValue("config_node")).intValue();
            if (logger.isTraceEnabled()) {
                logger.trace("Looking up configNode: {} in nodeMap with size: {}", configNode, nodeMap.size());
                logger.trace("nodeMap contains key? {}", nodeMap.containsKey(configNode));
            }
            
            ResourceInfoProfileField field = nodeMap.get(configNode);
            if (logger.isTraceEnabled()) {
                logger.trace("field is null? {}", (field == null));
            }
            
            if (field != null && field.getReturns() != null) {
                if (logger.isTraceEnabled()) {
                    // Only access size if getReturns() is not null
                    int returnsSize = field.getReturns().size();
                    logger.trace("field.getReturns() size: {}", returnsSize);
                }
                
                // Only iterate if getReturns() is not null (this check is redundant with the outer if, but kept for clarity)
                for (ResourceInfoInputMapping returnMapping : field.getReturns()) {
                    String localVar = returnMapping.getLocalVar();
                    String sparqlVar = returnMapping.getSparqlVar();
                    
                    if (logger.isTraceEnabled()) {
                        logger.trace("returnMapping.getLocalVar(): {}", localVar);
                        logger.trace("returnMapping.getSparqlVar(): {}", sparqlVar);
                        logger.trace("binding.hasBinding(sparqlVar): {}", binding.hasBinding(sparqlVar));
                    }
                    
                    if (localVar != null && sparqlVar != null && binding.hasBinding(sparqlVar)) {
                        Value value = binding.getValue(sparqlVar);
                        if (logger.isTraceEnabled()) {
                            logger.trace("binding.getValue(sparqlVar): {}", value);
                        }
                        
                        if (value != null) {
                            newContext.addVariable(localVar, value);
                        } else if (logger.isTraceEnabled()) {
                            logger.trace("Value is null for sparqlVar: {}", sparqlVar);
                        }
                    } else if (logger.isTraceEnabled()) {
                        logger.trace("Cannot add variable. localVar: {}, sparqlVar: {}, hasBinding: {}", 
                                     localVar, sparqlVar, 
                                     (sparqlVar != null ? binding.hasBinding(sparqlVar) : "N/A"));
                    }
                }
            } else if (logger.isTraceEnabled()) {
                if (field == null) {
                    logger.trace("Null field for configNode: {}", configNode);
                    // Print all keys in nodeMap for debugging
                    logger.trace("Available keys in nodeMap: {}", nodeMap.keySet());
                } else if (field.getReturns() == null) {
                    logger.trace("field.getReturns() is null for configNode: {}", configNode);
                }
            }
        }
        return newContext;
    }

    private Set<IRI> extractProvenanceIris(List<BindingSet> bindings) {
        Set<IRI> provenanceIris = new HashSet<>();
        for (BindingSet binding : bindings) {
            if (binding.hasBinding("provUri")) {
                provenanceIris.add((IRI) binding.getValue("provUri"));
            }
        }
        return provenanceIris;
    }

    private String buildFinalJson(IRI rootIri, List<BindingSet> allBindings, Repository repo,
            String preferredLanguage) {
        ObjectMapper om = JsonUtil.getDefaultObjectMapper();
        ObjectNode rootNode = om.createObjectNode();
        rootNode.put("@id", rootIri.stringValue());

        Set<IRI> allIris = new HashSet<>();
        Set<IRI> fieldIris = new HashSet<>();
        allIris.add(rootIri);

        // Collect all IRIs
        for (BindingSet binding : allBindings) {
            for (String name : binding.getBindingNames()) {
                Value value = binding.getValue(name);
                if (value instanceof IRI) {
                    allIris.add((IRI) value);
                }
            }
            if (binding.hasBinding("field")) {
                fieldIris.add((IRI) binding.getValue("field"));
            }
        }

        // Fetch all labels at once
        Map<IRI, Optional<Literal>> labels = labelCache.getLabels(allIris, repo, preferredLanguage);
        Map<IRI, Optional<Literal>> fieldLabels = labelCache.getLabels(fieldIris,
                repositoryManager.getAssetRepository(), preferredLanguage);

        Optional<Literal> rootLabel = labels.get(rootIri);
        if (rootLabel.isPresent()) {
          rootNode.put("label", rootLabel.get().stringValue());
        }

        // Create an index of bindings by subject
        Map<IRI, List<BindingSet>> bindingIndex = new HashMap<>();
        for (BindingSet binding : allBindings) {
            // Skip bindings that don't have a subject
            if (!binding.hasBinding("subject")) {
                if (logger.isTraceEnabled()) {
                    logger.trace("Binding does not have subject, skipping");
                }
                continue;
            }
            
            IRI subject = (IRI) binding.getValue("subject");
            bindingIndex.computeIfAbsent(subject, k -> new ArrayList<>()).add(binding);
        }

        // Build the JSON structure iteratively
        buildJsonStructure(rootNode, bindingIndex, labels, fieldLabels, om, rootIri);

        return rootNode.toString();
    }

    private void buildJsonStructure(ObjectNode rootNode, Map<IRI, List<BindingSet>> bindingIndex,
            Map<IRI, Optional<Literal>> labels, Map<IRI, Optional<Literal>> fieldLabels, ObjectMapper om, IRI rootIri) {
        Deque<Pair<ObjectNode, IRI>> stack = new ArrayDeque<>();
        stack.push(new Pair<>(rootNode, rootIri));

        int depth = 0;
        while (!stack.isEmpty()) {
            if (depth > MAX_RECURSION_DEPTH) {
                throw new RuntimeException("Maximum recursion depth exceeded.");
            }
            depth++;
    
            Pair<ObjectNode, IRI> current = stack.pop();
            ObjectNode currentNode = current.getLeft();
            IRI currentIri = current.getRight();

            List<BindingSet> relevantBindings = bindingIndex.get(currentIri);
            if (relevantBindings == null) {
                continue;
            }

            Map<IRI, ObjectNode> fieldNodes = new HashMap<>();

            for (BindingSet binding : relevantBindings) {
                IRI fieldIri = (IRI) binding.getValue("field");
                Value value = binding.getValue("value");

                ObjectNode fieldNode = fieldNodes.computeIfAbsent(fieldIri, k -> {
                    ObjectNode node = currentNode.putObject(k.stringValue());
                    node.put("@id", k.stringValue());
                    String fieldLabel = fieldLabels.get(k).map(Literal::stringValue).orElse(k.getLocalName());
                    node.put("label", fieldLabel);
                    node.putArray("values");
                    return node;
                });

                ArrayNode valuesArray = (ArrayNode) fieldNode.get("values");

                ObjectNode valueNode = om.createObjectNode();
                if (value instanceof IRI) {
                    IRI valueIri = (IRI) value;
                    valueNode.put("@id", valueIri.stringValue());
                    String valueLabel = labels.get(valueIri).map(Literal::stringValue).orElse(valueIri.getLocalName());
                    valueNode.put("label", valueLabel);
                    stack.push(new Pair<>(valueNode, valueIri));
                } else {
                    valueNode.put("@value", value.stringValue());
                }

                // Handle provenance
                if (binding.hasBinding("provUri")) {
                    IRI provUri = (IRI) binding.getValue("provUri");
                    ArrayNode provenanceArray = valueNode.putArray("provenance");

                    ObjectNode provNode = om.createObjectNode();
                    provNode.put("@id", provUri.stringValue());
                    provenanceArray.add(provNode);

                    // Push provenance to stack for later processing
                    stack.push(new Pair<>(provNode, provUri));
                }

                // Add the value node to the values array, avoiding duplicates
                if (!containsDuplicate(valuesArray, valueNode)) {
                    valuesArray.add(valueNode);
                }
            }
        }
    }

    private boolean containsDuplicate(ArrayNode array, JsonNode newNode) {
        for (JsonNode existingNode : array) {
            if (nodeEquals(existingNode, newNode)) {
                // If nodes are equal, merge provenance
                if (newNode.has("provenance") && existingNode.has("provenance")) {
                    ArrayNode existingProvenance = (ArrayNode) existingNode.get("provenance");
                    ArrayNode newProvenance = (ArrayNode) newNode.get("provenance");
                    for (JsonNode provNode : newProvenance) {
                        if (!containsProvenanceNode(existingProvenance, provNode)) {
                            existingProvenance.add(provNode);
                        }
                    }
                }
                return true;
            }
        }
        return false;
    }

    private boolean nodeEquals(JsonNode node1, JsonNode node2) {
        if (node1.has("@id") && node2.has("@id")) {
            return node1.get("@id").asText().equals(node2.get("@id").asText());
        } else if (node1.has("@value") && node2.has("@value")) {
            return node1.get("@value").asText().equals(node2.get("@value").asText());
        }
        return false;
    }

    private boolean containsProvenanceNode(ArrayNode provenanceArray, JsonNode newProvNode) {
        for (JsonNode existingProvNode : provenanceArray) {
            if (existingProvNode.get("@id").asText().equals(newProvNode.get("@id").asText())) {
                return true;
            }
        }
        return false;
    }

    // Helper class to pair ObjectNode with IRI
    private static class Pair<L, R> {
        private final L left;
        private final R right;

        public Pair(L left, R right) {
            this.left = left;
            this.right = right;
        }

        public L getLeft() {
            return left;
        }

        public R getRight() {
            return right;
        }
    }

    public class Context {
        private Map<String, Set<Value>> variables;
        private Context parent;

        public Context() {
            this.variables = new HashMap<>();
        }

        public Context(Context parent) {
            this();
            this.parent = parent;
        }

        public void addVariable(String name, Value value) {
            variables.computeIfAbsent(name, k -> new LinkedHashSet<>()).add(value);
        }

        public void addVariable(String name, Collection<? extends Value> values) {
            variables.computeIfAbsent(name, k -> new LinkedHashSet<>()).addAll(values);
        }

        public Set<Value> getValues(String name) {
            Set<Value> values = new LinkedHashSet<>(variables.getOrDefault(name, Collections.emptySet()));
            if (values.isEmpty() && parent != null) {
                values.addAll(parent.getValues(name));
            }
            return values;
        }

        public boolean hasSubjectFor(String name) {
            return !getValues(name).isEmpty();
        }

        public List<Map<String, Value>> getCombinations(List<String> varNames) {
            List<Map<String, Value>> combinations = new ArrayList<>();
            getCombinationsRecursive(new HashMap<>(), varNames, 0, combinations);
            return combinations;
        }

        private void getCombinationsRecursive(Map<String, Value> current, List<String> varNames, int index,
                List<Map<String, Value>> result) {
            if (index == varNames.size()) {
                result.add(new HashMap<>(current));
                return;
            }

            String varName = varNames.get(index);
            for (Value value : getValues(varName)) {
                current.put(varName, value);
                getCombinationsRecursive(current, varNames, index + 1, result);
            }
        }

        @Override
        public String toString() {
            return toString(0);
        }

        private String toString(int depth) {
            StringBuilder sb = new StringBuilder();
            String indent = "  ".repeat(depth);

            sb.append(indent).append("Context{\n");

            for (Map.Entry<String, Set<Value>> entry : variables.entrySet()) {
                sb.append(indent).append("  ").append(entry.getKey()).append(": [");
                Set<Value> values = entry.getValue();
                Iterator<Value> iterator = values.iterator();
                while (iterator.hasNext()) {
                    sb.append(iterator.next());
                    if (iterator.hasNext()) {
                        sb.append(", ");
                    }
                }
                sb.append("]\n");
            }

            if (parent != null) {
                sb.append(indent).append("  Parent: ").append("\n");
                sb.append(parent.toString(depth + 1));
            } else {
                sb.append(indent).append("  Parent: none\n");
            }

            sb.append(indent).append("}");

            return sb.toString();
        }

    }
}
