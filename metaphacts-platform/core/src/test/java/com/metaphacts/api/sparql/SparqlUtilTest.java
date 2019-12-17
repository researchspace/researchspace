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

package com.metaphacts.api.sparql;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.List;

import javax.ws.rs.core.MediaType;

import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriter;
import org.eclipse.rdf4j.query.resultio.sparqljson.SPARQLResultsJSONWriter;
import org.eclipse.rdf4j.query.resultio.sparqlxml.SPARQLResultsXMLWriter;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.rdfxml.RDFXMLWriter;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.metaphacts.api.sparql.SparqlUtil.SparqlOperation;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class SparqlUtilTest {
    @Rule
    public ExpectedException exception= ExpectedException.none();
    
    @Test
    public void testSelect() throws MalformedQueryException{
        assertEquals(SparqlOperation.SELECT,SparqlUtil.getOperationType("Select * WHERE {?a ?b ?c}"));
    }
    @Test
    public void testAsk() throws MalformedQueryException{
        assertEquals(SparqlOperation.ASK,SparqlUtil.getOperationType("ASK {?a ?b ?c}"));
    }
    @Test
    public void testConstruct() throws MalformedQueryException{
        assertEquals(SparqlOperation.CONSTRUCT,SparqlUtil.getOperationType("CONSTRUCT {?a ?b ?c} WHERE {?a ?b ?c}"));
    }

    @Test
    public void testDescribe() throws MalformedQueryException{
        assertEquals(SparqlOperation.DESCRIBE,SparqlUtil.getOperationType("DESCRIBE <http://xmlns.com/foaf/0.1/>"));
    }
    
    @Test
    public void testUpdate() throws MalformedQueryException{
        assertEquals(SparqlOperation.UPDATE,SparqlUtil.getOperationType("INSERT {?a ?b ?c} WHERE {?a ?b ?c}"));
    }
    
    
    @Test
    public void testExtractPrefixes(){
        List<String> expected = Lists.newArrayList("","foaf", "dc", "xsd");
        String operationString = "#asf \n prefix foaf:<http://xmlns.com/foaf/0.1/>\n PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n prefix dc:   <http://purl.org/dc/elements/1.1/>\n PREFIX : <http://metaphacts.com/> ";
        assertThat(expected, containsInAnyOrder(SparqlUtil.extractPrefixes(operationString).toArray()));
    }
    
    @Test
    public void testExtractPrefixes_special() {
        String query = 
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + 
                "PREFIX with-dash: <http://example.org/with-dash/>\n" + 
                "PREFIX number123:   <http://example.org/withNumber/>\n" +
                "PREFIX Àünicode:\t <http://example.org/unicode/>\n" +
                "SELECT * WHERE {" + 
                "  ?s ?p ?o \n" +
                "} ";
        Assert.assertEquals(Sets.newHashSet("rdfs", "with-dash", "number123", "Àünicode"),
                SparqlUtil.extractPrefixes(query));
    }
    
    @Test
    public void testExtractPrefixesWithNoLinebreaks(){
        List<String> expected = Lists.newArrayList("","foaf", "dc", "xsd");
        String operationString = "prefix foaf:<http://xmlns.com/foaf/0.1/> PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>prefix dc:   <http://purl.org/dc/elements/1.1/>\n PREFIX : <http://metaphacts.com/> ";
        assertThat(expected, containsInAnyOrder(SparqlUtil.extractPrefixes(operationString).toArray()));
    }
    
    @Test
    public void prependPrefixesTest(){
        HashMap<String, String> prefixMap = Maps.newHashMap();
        prefixMap.put("foaf", "http://xmlns.com/foaf/0.1/");
        prefixMap.put("dcat", "http://www.w3.org/ns/dcat#");
        prefixMap.put("skos", "http://www.w3.org/2004/02/skos/core#");
        prefixMap.put("sp", "http://spinrdf.org/sp#");
        prefixMap.put("dc", "http://purl.org/dc/elements/1.1/");
        prefixMap.put("with-dash", "http://example.org/with-dash/");
        String operationString = "#asf \n prefix foaf:<http://xmlns.com/foaf/0.1/>\n "
                + "PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n "
                + "prefix dc:   <http://purl.org/dc/elements/1.1/>\n "
                + "PREFIX : <http://metaphacts.com/> "
                + "PREFIX with-dash: <http://example.org/with-dash/> "
                + "SELECT $subject WHERE {"
                + "$subject a foaf:Agent."
                + "}LIMIT 10";
        String expectedString = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n"
                + "PREFIX dcat: <http://www.w3.org/ns/dcat#>\n"
                + "PREFIX sp: <http://spinrdf.org/sp#>\n"
                + "#asf \n prefix foaf:<http://xmlns.com/foaf/0.1/>\n "
                + "PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n "
                + "prefix dc:   <http://purl.org/dc/elements/1.1/>\n "
                + "PREFIX : <http://metaphacts.com/> "
                + "PREFIX with-dash: <http://example.org/with-dash/> "
                + "SELECT $subject WHERE {"
                + "$subject a foaf:Agent."
                + "}LIMIT 10";
        assertEquals(expectedString, SparqlUtil.prependPrefixes(operationString, prefixMap));
    }
    
    @Test
    public void testGetTupleQueryResultWriterForAcceptedMediaTypes() {
        TupleQueryResultWriter writer = SparqlUtil.getTupleQueryResultWriterForAcceptedMediaTypes(
                System.out, Lists.newArrayList(
                        MediaType.TEXT_HTML_TYPE, 
                        MediaType.APPLICATION_XML_TYPE, 
                        MediaType.APPLICATION_JSON_TYPE),
                TupleQueryResultFormat.JSON);
        assertTrue(writer instanceof SPARQLResultsXMLWriter);
    }
    
    @Test
    public void testGetTupleQueryResultWriterForAcceptedMediaTypesDefault() {
        TupleQueryResultWriter writer = SparqlUtil.getTupleQueryResultWriterForAcceptedMediaTypes(
                System.out, Lists.newArrayList(
                        MediaType.TEXT_HTML_TYPE),
                TupleQueryResultFormat.JSON);
        assertTrue(writer instanceof SPARQLResultsJSONWriter);
    }
    
    
    @Test
    public void testGetRDFWriterForAcceptedMediaTypes() {
        RDFWriter writer = SparqlUtil.getRDFWriterForAcceptedMediaTypes(
                System.out, Lists.newArrayList(
                        MediaType.TEXT_HTML_TYPE, 
                        MediaType.APPLICATION_XML_TYPE, 
                        MediaType.APPLICATION_JSON_TYPE),
                RDFFormat.TURTLE);
        assertTrue(writer instanceof RDFXMLWriter);
    }
    
    @Test
    public void testGetRDFWriterForAcceptedMediaTypesDefault() {
        RDFWriter writer = SparqlUtil.getRDFWriterForAcceptedMediaTypes(
                System.out, Lists.newArrayList(
                        MediaType.TEXT_HTML_TYPE, 
                        MediaType.APPLICATION_SVG_XML_TYPE),
                RDFFormat.TURTLE);
        /**
         * Since RDF4J 2.3 turtle writer is wrapped into a
         * {@link org.eclipse.rdf4j.rio.turtle.ArrangedWriter}, which is packaged private. So
         * effectively we can only test on the RDFFormat of the ArrangedWriter object here
         */
        assertTrue(writer.getRDFFormat().equals(RDFFormat.TURTLE));
    }
    
    @Test
    public void testIsEmpty() {
        String queryString = "#asf \n # prefix foaf:<http://xmlns.com/foaf/0.1/>\n "
                + "# PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n "
                + "# prefix dc:   <http://purl.org/dc/elements/1.1/>\n "
                + " \t \t  # PREFIX : <http://metaphacts.com/> \n"
                + "# SELECT $subject WHERE { \n"
                + "# $subject a foaf:Agent. \n"
                + "# }LIMIT 10";
        
        assertTrue(SparqlUtil.isEmpty(queryString));
    }
    
    @Test
    public void testIsEmptyFalse() {
        String queryString = "#asf \n # prefix foaf:<http://xmlns.com/foaf/0.1/>\n "
                + "# PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n "
                + "# prefix dc:   <http://purl.org/dc/elements/1.1/>\n "
                + " \t \t  SELECT * WHERE { ?x ?y ?z . } # PREFIX : <http://metaphacts.com/> \n"
                + "# SELECT $subject WHERE { \n"
                + "# $subject a foaf:Agent. \n"
                + "# }LIMIT 10";
        
        assertFalse(SparqlUtil.isEmpty(queryString));
    }
    
    @Test
    public void testReplaceAskWithSelect() {
        String askQuery = "PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> ASK \t \n WHERE { ?x rdfs:label ?label . }";
        String selectQuery = SparqlUtil.transformAskToSelect(askQuery);
        Assert.assertEquals("PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> SELECT * WHERE { ?x rdfs:label ?label . } LIMIT 1", selectQuery);
    }
    
    @Test
    public void testReplaceAskWithSelectNoSpace() {
        String askQuery = "PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> ASK \t \n WHERE{ ?x rdfs:label ?label . }";
        String selectQuery = SparqlUtil.transformAskToSelect(askQuery);
        Assert.assertEquals("PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> SELECT * WHERE { ?x rdfs:label ?label . } LIMIT 1", selectQuery);
    }
    
    @Test
    public void testReplaceAskWithSelectNoWhere() {
        String askQuery = "PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> ask \t \n \n { ?x rdfs:label ?label . }";
        String selectQuery = SparqlUtil.transformAskToSelect(askQuery);
        Assert.assertEquals("PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> SELECT * WHERE { ?x rdfs:label ?label . } LIMIT 1", selectQuery);
    }
    
    @Test
    public void testReplaceAskWithSelectNoWhereNoSpace() {
        String askQuery = "PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> ask{ ?x rdfs:label ?label . }";
        String selectQuery = SparqlUtil.transformAskToSelect(askQuery);
        Assert.assertEquals("PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> SELECT * WHERE { ?x rdfs:label ?label . } LIMIT 1", selectQuery);
    }
    

    @Test
    public void testReplaceAskWithSelectFail() {
        String askQuery = "PREFIX rdfs: <" + RDFS.NAMESPACE + 
                "> SELECT * WHERE { ?x rdfs:label ?label . }";
        try {
            SparqlUtil.transformAskToSelect(askQuery);
            Assert.fail("No exception thrown for invalid input");
        } catch (Exception e) {
            Assert.assertTrue(e instanceof IllegalArgumentException);
        }
    }

}