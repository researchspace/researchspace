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

package com.metaphacts.federation.sparql.optimizers;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Test;

import com.metaphacts.federation.sparql.SparqlAlgebraUtils;
import com.metaphacts.federation.sparql.optimizers.RemoveNodeQueryModelVisitor;

import org.junit.Assert;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class RemoveNodeQueryModelVisitorTest {

    @Test
    public void testJoinParent() throws Exception {
        String originalQuery = "SELECT ?a WHERE { ?a rdfs:label ?b . ?a rdfs:comment ?c }";
        
        ParsedTupleQuery parsed = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                originalQuery,
                null);
        
        StatementPatternCollector collector = new StatementPatternCollector();
        parsed.getTupleExpr().visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();
        
        Optional<StatementPattern> toRemoveOptional = stmtPatterns.stream().filter(stmtPattern -> 
                                        stmtPattern.getPredicateVar().hasValue() 
                                        && stmtPattern.getPredicateVar().getValue()
                                            .equals(RDFS.LABEL)).findFirst();
        
        Assert.assertTrue(toRemoveOptional.isPresent());
        StatementPattern toRemove = toRemoveOptional.get();
        
        String targetQuery = "SELECT ?a WHERE { ?a rdfs:comment ?c . }";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, null);
        
        toRemoveOptional = stmtPatterns.stream().filter(stmtPattern -> 
            stmtPattern.getPredicateVar().hasValue() 
            && stmtPattern.getPredicateVar().getValue()
                .equals(RDFS.COMMENT)).findFirst();
        
        Assert.assertTrue(toRemoveOptional.isPresent());
        toRemove = toRemoveOptional.get();
        
        targetQuery = "SELECT ?a WHERE { ?a rdfs:label ?b . }";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, null);
    }
    
    @Test
    public void testWithSubqueryAndScope() throws Exception {
        String originalQuery = "SELECT ?a WHERE { ?a rdfs:label ?b . ?a rdfs:comment ?c . "
                + " { SELECT ?a WHERE { ?a rdfs:label ?b . ?a rdfs:comment ?c . } } "
                + "}";
        
        ParsedTupleQuery parsed = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                originalQuery,
                null);
        
        StatementPatternCollector collector = new StatementPatternCollector();
        parsed.getTupleExpr().visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();
        
        List<StatementPattern> toRemoveList = stmtPatterns.stream().filter(stmtPattern -> 
                                        stmtPattern.getPredicateVar().hasValue() 
                                        && stmtPattern.getPredicateVar().getValue()
                                            .equals(RDFS.LABEL)).collect(Collectors.toList());
        
        Assert.assertEquals(2, toRemoveList.size());
        StatementPattern toRemove = toRemoveList.get(0);
        TupleExpr scope = SparqlAlgebraUtils.getScopeRoot(toRemove);
        
        String targetQuery = "SELECT ?a WHERE { ?a rdfs:comment ?c . "
                + " { SELECT ?a WHERE { ?a rdfs:label ?b . ?a rdfs:comment ?c . } } "
                + "}";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, scope);
        toRemove = toRemoveList.get(1);
        scope = SparqlAlgebraUtils.getScopeRoot(toRemove);

        targetQuery = "SELECT ?a WHERE { ?a rdfs:label ?b . ?a rdfs:comment ?c . "
                + " { SELECT ?a WHERE { ?a rdfs:comment ?c . } } "
                + "}";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, scope);
    }
    
    @Test
    public void testUnionParent() throws Exception {
        String originalQuery = "SELECT ?a ?b WHERE { { ?a rdfs:label ?b . } "
                + "UNION { ?a rdfs:comment ?b } }";
        
        ParsedTupleQuery parsed = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                originalQuery,
                null);
        
        StatementPatternCollector collector = new StatementPatternCollector();
        parsed.getTupleExpr().visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();
        
        Optional<StatementPattern> toRemoveOptional = stmtPatterns.stream().filter(stmtPattern -> 
                                        stmtPattern.getPredicateVar().hasValue() 
                                        && stmtPattern.getPredicateVar().getValue()
                                            .equals(RDFS.LABEL)).findFirst();
        
        Assert.assertTrue(toRemoveOptional.isPresent());
        StatementPattern toRemove = toRemoveOptional.get();
        
        String targetQuery = "SELECT ?a ?b WHERE { ?a rdfs:comment ?b }";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, null);
        
        toRemoveOptional = stmtPatterns.stream().filter(stmtPattern -> 
            stmtPattern.getPredicateVar().hasValue() 
            && stmtPattern.getPredicateVar().getValue()
                .equals(RDFS.COMMENT)).findFirst();
    
        Assert.assertTrue(toRemoveOptional.isPresent());
        toRemove = toRemoveOptional.get();
        
        targetQuery = "SELECT ?a ?b WHERE { ?a rdfs:label ?b . }";
        checkRemoveStatementPattern(originalQuery, toRemove, targetQuery, null);
    }
    
    private void checkRemoveStatementPattern(
            String original, 
            StatementPattern toRemove, 
            String target,
            TupleExpr scope) throws Exception {
        ParsedTupleQuery parsed = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                original,
                null);
        RemoveNodeQueryModelVisitor visitor = new RemoveNodeQueryModelVisitor(toRemove, scope);
        parsed.getTupleExpr().visit(visitor);
        
        ParsedTupleQuery targetParsed = (ParsedTupleQuery)QueryParserUtil.parseQuery(
                QueryLanguage.SPARQL, 
                target,
                null);
        
        Assert.assertEquals(targetParsed.getTupleExpr(), parsed.getTupleExpr());
    }

}