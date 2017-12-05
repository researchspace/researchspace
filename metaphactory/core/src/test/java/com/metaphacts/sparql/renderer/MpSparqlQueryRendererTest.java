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

package com.metaphacts.sparql.renderer;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.sparql.renderer.MpSparqlQueryRenderer;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpSparqlQueryRendererTest {
    
    private String loadQuery(String queryId) throws Exception {
        BufferedReader reader = new BufferedReader(
                new InputStreamReader(MpSparqlQueryRendererTest.class
                    .getResourceAsStream(queryId + ".sq"), "UTF-8"));
        StringBuilder textBuilder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            textBuilder.append(line + "\n");
        }
        return textBuilder.toString().trim();
    }
    
    @Test
    public void testQueryWithValues() throws Exception {
        String query = loadQuery("queryWithValuesClause");
        testSingleQuery("queryWithValuesClause", query);
    }
    
    @Test
    public void testSimpleRegex() throws Exception {
        String query = loadQuery("simpleRegexQuery");
        testSingleQuery("simpleRegexQuery", query);
    }
    
    @Test
    public void testQueryWithLiterals() throws Exception {
        String query = loadQuery("queryWithLiterals");
        testSingleQuery("queryWithLiterals", query);
    }
    
    @Test
    public void testWikiNextprotExample() throws Exception {
        String query = loadQuery("wikiNextprotExample");
        testSingleQuery("wikiNextprotExample", query);
    }
    
    @Test
    public void testQueryWithGroupByOrderLimitAndAggFilter() throws Exception {
        String query = loadQuery("queryWithGroupByOrderLimitAndAggFilter");
        testSingleQuery("queryWithGroupByOrderLimitAndAggFilter", query);
    }
    
    @Test
    public void testQueryWithASubqueryAndGroupBy() throws Exception {
        String query = loadQuery("queryWithASubqueryAndGroupBy");
        testSingleQuery("queryWithASubqueryAndGroupBy", query);
    }
    
    @Test
    public void testQueryWithGroupByAndBind() throws Exception {
        String query = loadQuery("queryWithGroupByAndBind");
        testSingleQuery("queryWithGroupByAndBind", query);
    }
    
    private void testSingleQuery(String id, String strQuery) {
        MpSparqlQueryRenderer mpQueryRenderer = new MpSparqlQueryRenderer(); 
        ParsedTupleQuery query = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                strQuery, null);
        String renderedQuery = "";
        try {
            renderedQuery = mpQueryRenderer.render(query);
        } catch (Exception e) {
            throw new AssertionError("Could not render a parsed query "
                    + id
                    + ": "
                    + e.getMessage(), e);
        }
        try {
            ParsedTupleQuery restoredQuery = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                    QueryLanguage.SPARQL, 
                    renderedQuery, null);
            Assert.assertEquals(
                    "Error in the query " 
                    + id 
                    + " defined as:\n" 
                    + strQuery
                    + "\nThe rendered query was:\n"
                    + renderedQuery,
                    query.toString(), 
                    restoredQuery.toString());
        } catch (Exception e) {
            throw new AssertionError("Could not parse the rendered query: [" 
                    + renderedQuery + "]. Reason: " + e.getMessage(), e);
        }
    }
}