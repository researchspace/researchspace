package org.researchspace.x3ml;

import org.xml.sax.Attributes;
import org.xml.sax.Locator;
import org.xml.sax.helpers.XMLFilterImpl;

import java.util.*;

/**
 * CustomFilter is an XMLFilter implementation that tracks node information,
 * including their start and end positions in the document. It builds the absolute
 * XPath for each node and can provide the node at a specified position.
 * 
 * Example:
 * Given the following XML:
 * <root>
 *   <parent>
 *     <child attr="value">Text</child>
 *   </parent>
 *   <parent>
 *     <child>Another Text</child>
 *   </parent>
 * </root>
 * 
 * The absolute XPath for the first <child> element would be "/root[1]/parent[1]/child[1]"
 * and for the second <child> element, it would be "/root[1]/parent[2]/child[1]".
 */
public class CustomFilter extends XMLFilterImpl {

    private Deque<NodeInfo> nodes = new ArrayDeque<>();
    private Locator locator;
    private Map<String, NodeInfo> trackedNodesMap = new HashMap<>();
    private Deque<Map<String, Integer>> siblingCounts = new ArrayDeque<>(); 

    // Object to track the latest starting position for elements
    private SourcePosition startElePoint = new SourcePosition();

    /**
     * Represents information about an XML node, including its name, start and end positions,
     * and its absolute XPath.
     * 
     * Example:
     * For the XML element <child attr="value">Text</child>:
     * - name: "child"
     * - startLine: 3
     * - startOffset: 9
     * (assuming the element starts at line 3, column 9)
     */
    public static class NodeInfo {
        private String name;
        private int startLine;
        private int startOffset;
        private int endLine;
        private int endOffset;
        private String absoluteXPath;

        public NodeInfo(String name, int startLine, int startOffset, String absoluteXPath) {
            this.name = name;
            this.startLine = startLine;
            this.startOffset = startOffset;
            this.absoluteXPath = absoluteXPath;
        }

        // Getters and setters...

        public String getName() {
            return name;
        }

        public int getStartLine() {
            return startLine;
        }

        public int getStartOffset() {
            return startOffset;
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

        @Override
        public String toString() {
            return "NodeInfo{" +
                    "name='" + name + '\'' +
                    ", startLine=" + startLine +
                    ", startOffset=" + startOffset +
                    ", endLine=" + endLine +
                    ", endOffset=" + endOffset +
                    ", absoluteXPath='" + absoluteXPath + '\'' +
                    '}';
        }
    }

    @Override
    public void setDocumentLocator(Locator locator) {
        this.locator = locator;
    }

    @Override
    public void startElement(String uri, String localName, String qName, Attributes attributes) {
        if (siblingCounts.isEmpty()) {
            siblingCounts.push(new HashMap<>());
        }
        
        Map<String, Integer> currentSiblingCounts = siblingCounts.peek();
        
        // Determine the index of the current sibling
        int siblingIndex = currentSiblingCounts.getOrDefault(localName, 0) + 1;
        currentSiblingCounts.put(localName, siblingIndex);
        
        // Build the absolute XPath for the current element
        String parentXPath = nodes.isEmpty() ? "" : nodes.peek().getAbsoluteXPath();
        String absoluteXPath = parentXPath + "/" + localName + "[" + siblingIndex + "]";

        // Get the start position from the tracked position
        int startLine = startElePoint.getLine();
        int startOffset = startElePoint.getColumn();
        
        NodeInfo nodeInfo = new NodeInfo(localName, startLine, startOffset, absoluteXPath);
        nodes.push(nodeInfo);
        trackedNodesMap.put(absoluteXPath, nodeInfo);

        // Update the starting point for the next tag
        updateElePoint(locator);
        
        siblingCounts.push(new HashMap<>());
    }

    @Override
    public void endElement(String uri, String localName, String qName) {
        NodeInfo node = nodes.pop();
        node.setEndLine(locator.getLineNumber());
        node.setEndOffset(locator.getColumnNumber());
        
        siblingCounts.pop();
        
        // Update the starting point for the next tag
        updateElePoint(locator);
    }

    @Override
    public void characters(char[] ch, int start, int length) {
        updateElePoint(locator);
    }

    @Override
    public void ignorableWhitespace(char[] ch, int start, int length) {
        updateElePoint(locator);
    }

    /**
     * Update the starting position for the next element based on the current position
     * of the locator.
     *
     * @param locator The current Locator instance.
     */
    private void updateElePoint(Locator locator) {
        SourcePosition position = new SourcePosition(locator.getLineNumber(), locator.getColumnNumber());
        if (startElePoint.compareTo(position) < 0) {
            startElePoint = position;
        }
    }

    /**
     * Get the most specific node that contains the given line and offset.
     *
     * @param line   The line number.
     * @param offset The column offset.
     * @return The NodeInfo corresponding to the most specific node.
     */
    public NodeInfo getNodeAtPosition(int line, int offset) {
        NodeInfo mostSpecificNode = null;

        for (NodeInfo node : trackedNodesMap.values()) {
            if (isWithinNode(node, line, offset)) {
                if (mostSpecificNode == null || isMoreSpecific(node, mostSpecificNode, line, offset)) {
                    mostSpecificNode = node;
                }
            }
        }
        return mostSpecificNode;
    }

    /**
     * Check if the given position is within the start and end positions of the node.
     *
     * @param node   The NodeInfo to check against.
     * @param line   The line number.
     * @param offset The column offset.
     * @return True if the position is within the node; otherwise, false.
     */
    private boolean isWithinNode(NodeInfo node, int line, int offset) {
        if (line < node.getStartLine() || line > node.getEndLine()) {
            return false;
        }
        if (line == node.getStartLine() && offset < node.getStartOffset()) {
            return false;
        }
        if (line == node.getEndLine() && offset > node.getEndOffset()) {
            return false;
        }
        return true;
    }

    /**
     * Determine if the first node is more specific (closer) than the second node
     * to the given position.
     *
     * @param node1  The first NodeInfo.
     * @param node2  The second NodeInfo.
     * @param line   The line number.
     * @param offset The column offset.
     * @return True if the first node is more specific; otherwise, false.
     */
    private boolean isMoreSpecific(NodeInfo node1, NodeInfo node2, int line, int offset) {
        // Calculate distance to the given position from both nodes
        int distance1 = computeDistance(node1, line, offset);
        int distance2 = computeDistance(node2, line, offset);
        return distance1 < distance2;
    }

    /**
     * Compute the distance from the given position to the start or end of a node.
     * The distance is a metric calculated as the weighted sum of the absolute differences
     * in line numbers and column offsets. A weight of 1000 is given to line differences
     * to prioritize line differences over small column differences.
     * 
     * Example:
     * - If the node starts at line 3, column 10 and the position is line 3, column 15:
     *   The distance to the start is abs(3 - 3) * 1000 + abs(10 - 15) = 5
     * - If the node ends at line 4, column 20 and the position is line 3, column 15:
     *   The distance to the end is abs(4 - 3) * 1000 + abs(20 - 15) = 1005
     *
     * @param node   The NodeInfo.
     * @param line   The line number.
     * @param offset The column offset.
     * @return The computed distance.
     */
    private int computeDistance(NodeInfo node, int line, int offset) {
        // Total distance is the weighted sum of the line and offset distances
        int startDistance = Math.abs(node.getStartLine() - line) * 1000 + Math.abs(node.getStartOffset() - offset);
        int endDistance = Math.abs(node.getEndLine() - line) * 1000 + Math.abs(node.getEndOffset() - offset);
        return Math.min(startDistance, endDistance);
    }

    /**
     * Get the absolute XPath for a given node.
     *
     * @param nodeInfo The NodeInfo.
     * @return The absolute XPath as a string.
     */
    public String getAbsoluteXPath(NodeInfo nodeInfo) {
        return nodeInfo.getAbsoluteXPath();
    }

    /**
     * Get the map of tracked nodes.
     *
     * @return A map of absolute XPath to NodeInfo.
     */
    public Map<String, NodeInfo> getTrackedNodesMap() {
        return trackedNodesMap;
    }

    /**
     * Represents the position (line and column) of a point in the document.
     * 
     * Example:
     * If an element starts at line 3, column 10, the SourcePosition would be
     * new SourcePosition(3, 10).
     */
    class SourcePosition implements Comparable<SourcePosition> {
        private int line;
        private int column;

        public SourcePosition(){
            this.line = 1;
            this.column = 1;
        }

        public SourcePosition(int line, int column) {
            this.line = line;
            this.column = column;
        }

        public int getLine() {
            return line;
        }

        public int getColumn() {
            return column;
        }

        public void setLine(int line) {
            this.line = line;
        }

        public void setColumn(int column) {
            this.column = column;
        }

        @Override
        public int compareTo(SourcePosition o) {
            if (o.getLine() > this.getLine() ||
                (o.getLine() == this.getLine() &&
                o.getColumn() > this.getColumn())) {
                return -1;
            } else if (o.getLine() == this.getLine() &&
                o.getColumn() == this.getColumn()) {
                return 0;
            } else {
                return 1;
            }
        }
    }
}
