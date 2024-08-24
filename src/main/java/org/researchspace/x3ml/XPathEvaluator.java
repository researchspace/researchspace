package org.researchspace.x3ml;

import org.researchspace.x3ml.CustomFilter.NodeInfo;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

import gr.forth.ics.isl.x3ml.engine.xpath.Namespace;
import gr.forth.ics.isl.x3ml.engine.xpath.UUIDFunction_v3;
import net.sf.saxon.s9api.*;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import javax.xml.transform.stream.StreamSource;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class XPathEvaluator {
    public List<XPathResult> evaluate(InputStream data, List<String> xpaths) throws Exception {
        // Buffer the input data to allow re-use
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] temp = new byte[1024];
        int bytesRead;
        while ((bytesRead = data.read(temp)) != -1) {
            buffer.write(temp, 0, bytesRead);
        }
        byte[] content = buffer.toByteArray();

        List<XPathResult> results = new ArrayList<>();

        // Create the SAX parser and reader
        SAXParserFactory factory = SAXParserFactory.newInstance();
        factory.setNamespaceAware(true);
        SAXParser parser = factory.newSAXParser();
        XMLReader reader = parser.getXMLReader();

        // Create and setup the custom filter
        CustomFilter customFilter = new CustomFilter();
        customFilter.setParent(reader);
        reader.setContentHandler(customFilter);

        // Parse the input data using SAX
        try (InputStream saxStream = new ByteArrayInputStream(content)) {
            reader.parse(new InputSource(saxStream));
        }

        // Evaluate each XPath expression using Saxon API
        Processor processor = new Processor(false);

        // register custom functions that are used in X3ML engine
        processor.registerExtensionFunction(new UUIDFunction_v3());

        DocumentBuilder builder = processor.newDocumentBuilder();
        XdmNode xdmNode;
        try (InputStream domStream = new ByteArrayInputStream(content)) {
            xdmNode = builder.build(new StreamSource(domStream));
        }

        XPathCompiler xPathCompiler = processor.newXPathCompiler();
        xPathCompiler.declareNamespace(Namespace.CUSTOM_FUNCTIONS_PREFIX, Namespace.CUSTOM_FUNCTIONS_NAMESPACE);

        for (String expr : xpaths) {
            XPathSelector selector = xPathCompiler.compile(expr).load();
            selector.setContextItem(xdmNode);
            XdmValue xdmValue = selector.evaluate();

            for (XdmItem item : xdmValue) {
                if (item.isNode() && ((XdmNode) item).getNodeKind() == XdmNodeKind.ELEMENT) {
                    XdmNode xdmNodeItem = (XdmNode) item;
                    String nodeName = xdmNodeItem.getNodeName().toString();
                    String nodeValue = xdmNodeItem.getStringValue();
                    String absoluteXpath = getXPath(xdmNodeItem, xPathCompiler);  // Obtain the XPath using manual method

                    // Locate the specific node in the tracked nodes map
                    Map<String, NodeInfo> trackedNodesMap = customFilter.getTrackedNodesMap();
                    NodeInfo nodeInfo = trackedNodesMap.get(absoluteXpath);
                    if (nodeInfo != null) {
                        XPathResult result = new XPathResult();
                        result.setXpath(expr);
                        result.setResultType("node");
                        result.setNodeName(nodeName);
                        result.setText(nodeValue);
                        result.setStartLine(nodeInfo.getStartLine());
                        result.setStartOffset(nodeInfo.getStartOffset());
                        result.setEndLine(nodeInfo.getEndLine());
                        result.setEndOffset(nodeInfo.getEndOffset());
                        result.setAbsoluteXPath(nodeInfo.getAbsoluteXPath());
                        results.add(result);
                    }
                } else {
                        XPathResult result = new XPathResult();
                        result.setXpath(expr);
                        result.setResultType("string");
                        result.setText(item.getStringValue());
                        results.add(result);

                }
            }
        }

        return results;
    }

    // Utility method to get XPath from an XdmNode
    private String getXPath(XdmNode node, XPathCompiler xPathCompiler) throws SaxonApiException {
        StringBuilder xpath = new StringBuilder();
        while (node != null && node.getNodeKind() == XdmNodeKind.ELEMENT) {
            String name = node.getNodeName().getLocalName();
            
            // Use XPath to determine the position of the current node
            XPathSelector selector = xPathCompiler.compile("count(preceding-sibling::" + name + ") + 1").load();
            selector.setContextItem(node);
            XdmAtomicValue posValue = (XdmAtomicValue) selector.evaluateSingle();
            long position = posValue.getLongValue();
            
            xpath.insert(0, "/" + name + "[" + position + "]");
            node = node.getParent();
        }
        return xpath.toString();
    }

    public static class XPathResult {
        private String xpath;
        private String text;
        private String nodeName;
        private int startLine;
        private int startOffset;
        private int endLine;
        private int endOffset;
        private String absoluteXPath;

        // can be string or node
        private String resultType;

        // Getters and setters
        public String getXpath() {
            return xpath;
        }

        public void setXpath(String xpath) {
            this.xpath = xpath;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public String getNodeName() {
            return nodeName;
        }

        public void setNodeName(String nodeName) {
            this.nodeName = nodeName;
        }

        public int getStartLine() {
            return startLine;
        }

        public void setStartLine(int startLine) {
            this.startLine = startLine;
        }

        public int getStartOffset() {
            return startOffset;
        }

        public void setStartOffset(int startOffset) {
            this.startOffset = startOffset;
        }

        public int getEndLine() {
            return endLine;
        }

        public void setEndLine(int endLine) {
            this.endLine = endLine;
        }

        public int getEndOffset() {
            return endOffset;
        }

        public void setEndOffset(int endOffset) {
            this.endOffset = endOffset;
        }

        public String getAbsoluteXPath() {
            return absoluteXPath;
        }

        public void setAbsoluteXPath(String absoluteXPath) {
            this.absoluteXPath = absoluteXPath;
        }

        public String getResultType() {
            return resultType;
        }

        public void setResultType(String resultType) {
            this.resultType = resultType;
        }
    }
}
