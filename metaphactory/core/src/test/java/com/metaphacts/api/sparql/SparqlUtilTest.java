/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import static org.junit.Assert.assertEquals;

import java.util.HashMap;
import java.util.List;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.eclipse.rdf4j.query.MalformedQueryException;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.MatcherAssert.*;

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
        String operationString = "#asf \n prefix foaf:<http://xmlns.com/foaf/0.1/>\n "
                + "PREFIX   xsd:  <http://www.w3.org/2001/XMLSchema#>\n "
                + "prefix dc:   <http://purl.org/dc/elements/1.1/>\n "
                + "PREFIX : <http://metaphacts.com/> "
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
                + "SELECT $subject WHERE {"
                + "$subject a foaf:Agent."
                + "}LIMIT 10";
        assertEquals(expectedString, SparqlUtil.prependPrefixes(operationString, prefixMap));
    }

}