package org.researchspace.services.x3ml;

import org.apache.commons.lang3.exception.ExceptionUtils;
import org.w3c.dom.*;
import javax.xml.parsers.*;
import javax.xml.xpath.*;
import java.io.*;
import java.util.*;
import java.util.stream.Collectors;

public class X3MLToSPARQL {

    private static class Path {
        List<Step> steps = new ArrayList<>();
        int variableCounter = 1;
        Set<String> usedPrefixes = new HashSet<>();
    
        void addPrefix(String prefix) {
            usedPrefixes.add(prefix);
        }

        void addStep(String subject, String relationship, String object) {
            steps.add(new Step(subject, relationship, object));
        }

        String nextVariable() {
            return "?x" + (variableCounter++);
        }

        static class Step {
            String subject, relationship, object;
            Step(String subject, String relationship, String object) {
                this.subject = subject;
                this.relationship = relationship;
                this.object = object;
            }
        }

        @Override
        public String toString() {
            return steps.stream()
                .map(step -> "  " + step.subject + " --[" + step.relationship + "]--> " + step.object)
                .collect(Collectors.joining("\n", "Path{\n", "\n}"));
        }
    }

    public static class LinkInfo {
        public String query, resultType, linkName, domain;
        public Optional<String> linkId;
        public Path path;

        LinkInfo(String query, String resultType, String linkName, String domain, Optional<String> linkId, Path path) {
            this.query = query;
            this.resultType = resultType;
            this.linkName = linkName;
            this.domain = domain;
            this.linkId = linkId;
            this.path = path;
        }

        @Override
        public String toString() {
            return String.format("LinkInfo{query='%s', resultType='%s', linkName='%s', domain='%s', linkId=%s, path=%s}",
                    query, resultType, linkName, domain, linkId, path);
        }
    }

    private XPath xpath;
    private Map<String, XPathExpression> expressions = new HashMap<>();
    private Map<String, String> namespaces = new HashMap<>();

    public X3MLToSPARQL() {
        try {
            xpath = XPathFactory.newInstance().newXPath();
            initializeExpressions();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void initializeExpressions() throws XPathExpressionException {
        expressions.put("directTargetRelationship", xpath.compile("target_relation/relationship"));
        expressions.put("directRelationship", xpath.compile("relationship"));
        expressions.put("directAdditional", xpath.compile("additional"));
        expressions.put("rangeAdditional", xpath.compile("target_node/entity/additional"));
        expressions.put("directInstanceGenerator", xpath.compile("instance_generator"));
        expressions.put("domain", xpath.compile("domain/target_node/entity/type"));
    }

    public List<LinkInfo> processXml(Document doc) {
        try {
            collectNamespaces(doc);
            List<LinkInfo> normalLinks = processNormalLinks(doc);
            List<LinkInfo> chainedLinks = buildChainedLinks(normalLinks);
            normalLinks.addAll(chainedLinks);
            return normalLinks;
        } catch (Exception e) {
            throw ExceptionUtils.<RuntimeException>rethrow(e);
        }
    }

    private void collectNamespaces(Document doc) {
        NodeList namespaceNodes = doc.getElementsByTagName("namespace");
        for (int i = 0; i < namespaceNodes.getLength(); i++) {
            Element namespaceElement = (Element) namespaceNodes.item(i);
            namespaces.put(namespaceElement.getAttribute("prefix"), namespaceElement.getAttribute("uri"));
        }
    }

    private List<LinkInfo> processNormalLinks(Document doc) throws Exception {
        List<LinkInfo> normalLinks = new ArrayList<>();
        NodeList mappingNodes = doc.getElementsByTagName("mapping");
        for (int m = 0; m < mappingNodes.getLength(); m++) {
            Element mappingElement = (Element) mappingNodes.item(m);
            String domain = getDomain(mappingElement);
            NodeList linkNodes = mappingElement.getElementsByTagName("link");
            for (int i = 0; i < linkNodes.getLength(); i++) {
                normalLinks.add(processLink((Element) linkNodes.item(i), domain));
            }
        }
        return normalLinks;
    }

    private String getDomain(Element mappingElement) throws Exception {
        Node domainNode = (Node) expressions.get("domain").evaluate(mappingElement, XPathConstants.NODE);
        if (domainNode != null) {
            String domain = domainNode.getTextContent().trim();
            int colonIndex = domain.indexOf(':');
            if (colonIndex > 0) {
                String prefix = domain.substring(0, colonIndex);
                String name = domain.substring(colonIndex + 1);
                return namespaces.getOrDefault(prefix, prefix) + name;
            }
            return domain;
        }
        return "undefined";
    }

    private LinkInfo processLink(Element linkElement, String domain) throws Exception {
        Path path = processPath((Element) linkElement.getElementsByTagName("path").item(0));
        Element rangeElement = (Element) linkElement.getElementsByTagName("range").item(0);
        String rangeSparql = processRange(rangeElement, path);
        String resultType = processResultType((Node) xpath.compile("target_node/entity/type").evaluate(rangeElement, XPathConstants.NODE));
        String linkName = Optional.ofNullable((Node) xpath.compile("comments/comment[1]/rationale").evaluate(linkElement, XPathConstants.NODE))
                .map(node -> node.getTextContent().trim())
                .orElse("undefined");
        Optional<String> linkId = extractLinkId(linkElement);
        String pathSparql = buildQueryFromPath(path);
        String prefixDeclarations = buildPrefixes(path.usedPrefixes);
        String sparqlQuery = prefixDeclarations + "SELECT DISTINCT ?subject ?value {\n ?subject a crm:E22_Human-Made_Object . \n" + pathSparql + rangeSparql + "}\n";
        return new LinkInfo(sparqlQuery, resultType, linkName, domain, linkId, path);
    }
    

    private String processResultType(Node resultTypeNode) {
        if (resultTypeNode != null) {
            String resultType = resultTypeNode.getTextContent().trim();
            if ("rdfs:Literal".equals(resultType)) {
                return "http://www.w3.org/2000/01/rdf-schema#Literal";
            }
            int colonIndex = resultType.indexOf(':');
            if (colonIndex > 0) {
                String prefix = resultType.substring(0, colonIndex);
                String name = resultType.substring(colonIndex + 1);
                return namespaces.getOrDefault(prefix, prefix) + name;
            }
            return resultType;
        }
        return "undefined";
    }

    private Optional<String> extractLinkId(Element element) throws Exception {
        Node linkNameNode = (Node) xpath.compile("path/comments/comment[1]/rationale").evaluate(element, XPathConstants.NODE);
        if (linkNameNode != null) {
            String linkName = linkNameNode.getTextContent().trim();
            int dotIndex = linkName.indexOf('.');
            return Optional.of(dotIndex > 0 ? linkName.substring(0, dotIndex) : linkName);
        }
        return Optional.empty();
    }

    private String buildPrefixes(Set<String> usedPrefixes) {
        return usedPrefixes.stream()
                .filter(namespaces::containsKey)
                .map(prefix -> String.format("PREFIX %s: <%s>\n", prefix, namespaces.get(prefix)))
                .collect(Collectors.joining());
    }

    private Path processPath(Element pathElement) throws Exception {
        Path path = new Path();
        NodeList relationshipNodes = (NodeList) expressions.get("directTargetRelationship").evaluate(pathElement, XPathConstants.NODESET);
        String prevVar = "?subject";
        for (int i = 0; i < relationshipNodes.getLength(); i++) {
            Element relationshipElement = (Element) relationshipNodes.item(i);
            String relationship = relationshipElement.getTextContent().trim();
            extractPrefix(path, relationship);
            String currentVar = (i == relationshipNodes.getLength() - 1) ? "?value" : path.nextVariable();
            path.addStep(prevVar, relationship, currentVar);
            processAdditionalNodes(relationshipElement, currentVar, path);
            prevVar = currentVar;
        }
        return path;
    }

    private void processAdditionalNodes(Element relationshipElement, String currentVar, Path path) throws Exception {
        Node entityNode = relationshipElement.getNextSibling();
        while (entityNode != null && (entityNode.getNodeType() != Node.ELEMENT_NODE || !entityNode.getNodeName().equals("entity"))) {
            entityNode = entityNode.getNextSibling();
        }
        if (entityNode != null) {
            NodeList additionalNodes = (NodeList) expressions.get("directAdditional").evaluate(entityNode, XPathConstants.NODESET);
            for (int j = 0; j < additionalNodes.getLength(); j++) {
                Path additionalPath = processAdditional((Element) additionalNodes.item(j), currentVar, path);
                path.steps.addAll(additionalPath.steps);
            }
        }
    }

    private String buildQueryFromPath(Path path) {
        return path.steps.stream()
                .map(step -> "  " + step.subject + " " + step.relationship + " " + step.object + " .")
                .collect(Collectors.joining("\n", "", "\n"));
    }

    private List<LinkInfo> buildChainedLinks(List<LinkInfo> normalLinks) {
        List<LinkInfo> chainedLinks = new ArrayList<>();
        Map<String, LinkInfo> linkMap = normalLinks.stream()
                .filter(link -> link.linkId.isPresent())
                .collect(Collectors.toMap(link -> link.linkId.get(), link -> link, (v1, v2) -> {
                    System.err.println("Warning: Duplicate link ID found: " + v1.linkId.get());
                    return v1;
                }));

        for (LinkInfo startLink : normalLinks) {
            startLink.linkId.ifPresent(id -> buildChainsFromLink(startLink, linkMap, chainedLinks));
        }

        return chainedLinks;
    }

    private void buildChainsFromLink(LinkInfo startLink, Map<String, LinkInfo> linkMap, List<LinkInfo> chainedLinks) {
        Queue<List<LinkInfo>> chainsToProcess = new LinkedList<>();
        chainsToProcess.offer(Collections.singletonList(startLink));

        while (!chainsToProcess.isEmpty()) {
            List<LinkInfo> currentChain = chainsToProcess.poll();
            LinkInfo lastLink = currentChain.get(currentChain.size() - 1);
            String lastId = lastLink.linkId.get();

            linkMap.keySet().stream()
                    .filter(nextId -> isValidNextLink(lastId, nextId))
                    .forEach(nextId -> {
                        List<LinkInfo> newChain = new ArrayList<>(currentChain);
                        newChain.add(linkMap.get(nextId));
                        if (newChain.size() > 1) {
                            chainedLinks.add(combineChain(newChain));
                        }
                        chainsToProcess.offer(newChain);
                    });
        }
    }

    private boolean isValidNextLink(String currentId, String nextId) {
        return nextId.startsWith(currentId + "-") && !nextId.substring(currentId.length() + 1).contains("-");
    }

    private LinkInfo combineChain(List<LinkInfo> chain) {
        String resultType = chain.get(chain.size() - 1).resultType;
        String linkName = chain.stream().map(link -> link.linkName).collect(Collectors.joining(" -> "));
        String domain = chain.get(0).domain;
        Optional<String> linkId = chain.get(0).linkId
                .flatMap(startId -> chain.get(chain.size() - 1).linkId.map(endId -> startId + "-" + endId));
    
        Path combinedPath = combinePaths(chain);
    
        String pathSparql = buildQueryFromPath(combinedPath);
        String prefixDeclarations = buildPrefixes(combinedPath.usedPrefixes);
        String finalSparql = prefixDeclarations + "SELECT DISTINCT ?subject ?value {\n ?subject a crm:E22_Human-Made_Object . \n" + pathSparql + "}\n";
    
        return new LinkInfo(finalSparql, resultType, linkName, domain, linkId, combinedPath);
    }    

    private Path combinePaths(List<LinkInfo> chain) {
        Path combinedPath = new Path();
        String lastObject = "?subject";
        int valueCounter = 1;
    
        for (int i = 0; i < chain.size(); i++) {
            Path currentPath = chain.get(i).path;
            combinedPath.usedPrefixes.addAll(currentPath.usedPrefixes);  // Merge prefixes
            
            Map<String, String> variableMap = new HashMap<>();
            variableMap.put("?subject", lastObject);
            
            for (int j = 0; j < currentPath.steps.size(); j++) {
                Path.Step currentStep = currentPath.steps.get(j);
                String subject = mapVariable(currentStep.subject, variableMap, combinedPath, i, chain.size());
                String object = mapVariable(currentStep.object, variableMap, combinedPath, i, chain.size());
                
                if (currentStep.object.equals("?value") && i < chain.size() - 1) {
                    object = "?value" + valueCounter++;
                }
                
                combinedPath.addStep(subject, currentStep.relationship, object);
                
                if (j == currentPath.steps.size() - 1) {
                    lastObject = object;
                }
            }
        }
        return combinedPath;
    }

    private String mapVariable(String variable, Map<String, String> variableMap, Path combinedPath, int currentChainIndex, int chainSize) {
        if (variable.equals("?subject")) {
            return variableMap.get("?subject");
        }
        if (variable.equals("?value") && currentChainIndex == chainSize - 1) {
            return variable;
        }
        if (variable.startsWith("<") && variable.endsWith(">")) {
            return variable;
        }
        return variableMap.computeIfAbsent(variable, k -> combinedPath.nextVariable());
    }

    private Set<String> extractPrefixesFromQueries(List<LinkInfo> chain) {
        return chain.stream()
                .flatMap(link -> Arrays.stream(link.query.split("\n")))
                .filter(line -> line.startsWith("PREFIX"))
                .collect(Collectors.toSet());
    }

    private String processRange(Element rangeElement, Path path) throws Exception {
        StringBuilder rangeSparql = new StringBuilder();
        NodeList additionalNodes = (NodeList) expressions.get("rangeAdditional").evaluate(rangeElement, XPathConstants.NODESET);
        for (int i = 0; i < additionalNodes.getLength(); i++) {
            Element additionalElement = (Element) additionalNodes.item(i);
            rangeSparql.append(processAdditional(additionalElement, "?value", path));
        }
        return rangeSparql.toString();
    }

    private Path processAdditional(Element additionalElement, String varName, Path parentPath) throws Exception {
        Path additionalPath = new Path();
        NodeList relationshipNodes = (NodeList) expressions.get("directRelationship").evaluate(additionalElement, XPathConstants.NODESET);
    
        for (int i = 0; i < relationshipNodes.getLength(); i++) {
            Element relationshipElement = (Element) relationshipNodes.item(i);
            String relationship = relationshipElement.getTextContent().trim();
            extractPrefix(additionalPath, relationship);
    
            Node entityNode = getNextEntityNode(relationshipElement);
    
            if (entityNode != null) {
                NodeList instanceGenerators = (NodeList) expressions.get("directInstanceGenerator").evaluate(entityNode, XPathConstants.NODESET);
                if (instanceGenerators.getLength() == 1) {
                    Element instanceGenerator = (Element) instanceGenerators.item(0);
                    NodeList args = instanceGenerator.getElementsByTagName("arg");
                    if (args.getLength() == 1) {
                        Element arg = (Element) args.item(0);
                        if ("constant".equals(arg.getAttribute("type"))) {
                            String constantValue = arg.getTextContent().trim();
                            additionalPath.addStep(varName, relationship, "<" + constantValue + ">");
                        }
                    }
                }
            }
        }
        
        // Merge prefixes from additional path to parent path
        parentPath.usedPrefixes.addAll(additionalPath.usedPrefixes);   
        return additionalPath;
    }

    private Node getNextEntityNode(Element relationshipElement) {
        Node entityNode = relationshipElement.getNextSibling();
        while (entityNode != null && (entityNode.getNodeType() != Node.ELEMENT_NODE || !entityNode.getNodeName().equals("entity"))) {
            entityNode = entityNode.getNextSibling();
        }
        return entityNode;
    }

    private void extractPrefix(Path path, String relationship) {
        int colonIndex = relationship.indexOf(':');
        if (colonIndex > 0) {
            String prefix = relationship.substring(0, colonIndex);
            path.addPrefix(prefix);
        }
    }    

    public static void main(String[] args) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setIgnoringElementContentWhitespace(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new File("path/to/your/mappings.xml"));

        X3MLToSPARQL converter = new X3MLToSPARQL();
        List<LinkInfo> links = converter.processXml(doc);
        
        links.forEach(link -> {
            System.out.println("Query:\n" + link.query);
            System.out.println("Result Type: " + link.resultType);
            System.out.println("Link Name: " + link.linkName);
            System.out.println("Domain: " + link.domain);
            System.out.println();
        });
    }
}