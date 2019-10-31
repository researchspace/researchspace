/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.data.rdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.StringReader;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.ccil.cowan.tagsoup.XMLWriter;
import org.ccil.cowan.tagsoup.jaxp.SAXParserImpl;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParserRegistry;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;

import com.google.common.base.Charsets;
import com.google.common.base.Throwables;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class RDFaExtractor {
    
    private static final Logger logger = LogManager.getLogger(RDFaExtractor.class);
    
    /**
     * Extracts RDF statements from a html string containing RDFa annotations.
     * 
     * @param htmlString
     *            String with HTML containing RDFa links
     * @param baseURI
     *            String representing the baseURI that is used by the RIO parser
     *            to resolve relative URIs against. For example, a simple RDFa
     *            link may have no direct subject and as such may automatically
     *            take the baseURI as subject reference.
     * @return {@link Model} with extracted {@link Statement}s or throws a
     *         {@link RuntimeException} otherwise (i.e. if parser is missing or
     *         on parsing errors). Empty model if not RDFa statements have been detected.
     */
    public static Model extractModel(String htmlString, String baseURI){
        if(logger.isTraceEnabled())
            logger.trace("Trying to extract RDFa statements from string: \n"+htmlString);
        RDFParserRegistry
                .getInstance()
                .get(RDFFormat.RDFA)
                .orElseThrow(
                        () -> new IllegalStateException("No RDFa parser registered."));
        Model rdfaAnnotations = new LinkedHashModel();
        try {
            String inputString = htmlToXMLString(htmlString);
            rdfaAnnotations.addAll(Rio.parse(new StringReader(inputString), baseURI , RDFFormat.RDFA));
        } catch (RDFParseException | UnsupportedRDFormatException | IOException | SAXException e) {
            logger.warn("Failed to extract RDFa statements from string. Reason: "+ e.getMessage());
            logger.debug("Details:", e);
            throw Throwables.propagate(e);
        }
        return rdfaAnnotations;
    }
    
    /**
     * Converts a simple HTML string into a proper XML tree string by using TagSoup
     * XMLReader. TagSoup will take care, for example, of closing all HTML tags properly. 
     * 
     * @param htmlString
     * @return proper xml/html tree
     * @throws IOException
     * @throws SAXException
     */
    private static String htmlToXMLString(String htmlString) throws IOException, SAXException{
        // create TagSoup reader
        XMLReader reader = SAXParserImpl.newInstance(null).getXMLReader();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        XMLWriter writer = new XMLWriter(new OutputStreamWriter(baos, Charsets.UTF_8));
        reader.setContentHandler(writer);

        reader.parse(new InputSource(new StringReader(htmlString)));

        return new String(baos.toByteArray(), Charsets.UTF_8);
    }

}