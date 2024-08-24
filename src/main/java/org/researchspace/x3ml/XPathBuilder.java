package org.researchspace.x3ml;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import java.io.InputStream;

public class XPathBuilder {
    public static String buildXPathFromPosition(InputStream data, int line, int offset) throws Exception {
        CustomFilter customFilter = new CustomFilter();

        SAXParserFactory saxParserFactory = SAXParserFactory.newInstance();
        saxParserFactory.setNamespaceAware(true);
        SAXParser saxParser = saxParserFactory.newSAXParser();

        XMLReader xmlReader = saxParser.getXMLReader();
        customFilter.setParent(xmlReader);
        xmlReader.setContentHandler(customFilter);

        InputSource inputSource = new InputSource(data);
        xmlReader.parse(inputSource);

        CustomFilter.NodeInfo nodeInfo = customFilter.getNodeAtPosition(line, offset);
        if (nodeInfo == null) {
            throw new Exception("Node not found at specified position");
        }
        return customFilter.getAbsoluteXPath(nodeInfo);
    }
}
