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

package com.metaphacts.sparql.keyword.virtuoso;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.List;

import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.TupleExprs;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import com.google.common.collect.Lists;
import com.metaphacts.sparql.keyword.algebra.KeywordSearchGroupTupleExpr;
import com.metaphacts.sparql.keyword.algebra.KeywordSearchPattern;
import com.metaphacts.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler.VirtuosoSparqlFullTextSearchSerializerQueryVisitor;
import com.metaphacts.sparql.renderer.ParsedQueryPreprocessor;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class VirtuosoKeywordSearchHandlerTest {

    static ValueFactory VF = SimpleValueFactory.getInstance();
    
    KeywordSearchPattern pattern;
    KeywordSearchGroupTupleExpr tupleExpr;
    VirtuosoKeywordSearchHandler handler;
    ParsedQueryPreprocessor parserVisitor;
    VirtuosoSparqlFullTextSearchSerializerQueryVisitor serializerVisitor;
    
    /**
     * Initializes with default values.
     */
    @Before
    public void prepare() {
        pattern = new KeywordSearchPattern();
        pattern.setSubjectVar(new Var("subj"));
        pattern.setMatchVar(new Var("label"));
        tupleExpr = new KeywordSearchGroupTupleExpr(); 
        tupleExpr.setKeywordSearchPattern(pattern);
        handler = new VirtuosoKeywordSearchHandler();
        parserVisitor = new ParsedQueryPreprocessor();
        serializerVisitor = 
                new VirtuosoSparqlFullTextSearchSerializerQueryVisitor();
    }
    
    
    @Test
    public void testSimple() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("token*")));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'token*'\" ."));
    }
    
    @Test
    public void testSimpleWithScore() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("token*")));
        pattern.setScoreVar(new Var("score"));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'token*'\" OPTION(score ?score) ."));
    }
    
    @Test
    public void testSimpleWithMultiplePredicates() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.COMMENT));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("token*")));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        checkLists(query, Lists.newArrayList(
                "?subj ?pred ?label .",
                "FILTER(?pred = <http://www.w3.org/2000/01/rdf-schema#label> || ?pred = <http://www.w3.org/2000/01/rdf-schema#comment>)",
                "?label <bif:contains> \"'token*'\" ."));
    }
    
    @Test
    public void testSimpleWithType() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("token*")));
        pattern.addTypeVar(TupleExprs.createConstVar(RDFS.CLASS));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'token*'\" .",
                "?subj <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2000/01/rdf-schema#Class> ."));
    }
    
    @Test
    public void testSimpleWithMultipleTypes() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("token*")));
        pattern.addTypeVar(TupleExprs.createConstVar(RDFS.CLASS));
        pattern.addTypeVar(TupleExprs.createConstVar(RDFS.RESOURCE));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'token*'\" .",
                "?subj <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?type .",
                "FILTER(?type = <http://www.w3.org/2000/01/rdf-schema#Class> || ?type = <http://www.w3.org/2000/01/rdf-schema#Resource>)"));
    }
    
    private void checkLists(String actual, List<String> expected) throws Exception {
        BufferedReader actualReader = new BufferedReader(new StringReader(actual));
        String line;
        for (String exp : expected) {
            boolean found = false;
            while ((line = actualReader.readLine()) != null) {
                if (line.trim().contains(exp.trim())) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                Assert.fail("Line \"" + exp + "\" was not found in the query " + actual);
            }
        } 
    }
    
    @Test
    public void testShortToken() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("tok*")));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        // LIKE pattern disabled
        // Deprecated for now:
        // checkLists(query, Lists.newArrayList(
        //      "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
        //      "FILTER( LCASE(?label) LIKE \"tok%\"^^<http://www.w3.org/2001/XMLSchema#string>) ."));
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'tok'\" ."));
    }
    
    @Test
    public void testMultipleTokens() throws Exception {
        pattern.addPredicateVar(TupleExprs.createConstVar(RDFS.LABEL));
        pattern.setValueVar(TupleExprs.createConstVar(VF.createLiteral("tok1* tok*")));
        String query = handler.generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        // tokens are separated with the "and" keyword
        // tokens that are too short cannot be rendered with wildcards
        checkLists(query, Lists.newArrayList(
                "?subj <http://www.w3.org/2000/01/rdf-schema#label> ?label .",
                "?label <bif:contains> \"'tok1*' and 'tok'\" ."));
    }
}