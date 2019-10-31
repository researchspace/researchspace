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

package com.metaphacts.federation.repository.optimizers;

import java.lang.reflect.UndeclaredThrowableException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.metaphacts.federation.sparql.MpOwnedTupleExpr;
import com.metaphacts.federation.sparql.VariableRetrievingVisitor;
import com.metaphacts.sparql.renderer.ParsedQueryPreprocessor;
import com.metaphacts.sparql.renderer.PreprocessedQuerySerializer;
import com.metaphacts.sparql.renderer.SerializableParsedTupleQuery;

/**
 * Generates SPARQL queries for detected {@link MpOwnedTupleExpr} 
 * nodes in the query tree.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpPrepareOwnedTupleExpr extends AbstractQueryModelVisitor<RepositoryException>
        implements QueryOptimizer {

    private TupleExpr root;
    
    public void optimize(TupleExpr query, Dataset dataset, BindingSet bindings) {
        try {
            this.root = query;
            query.visit(this);
        } catch (RepositoryException e) {
            throw new UndeclaredThrowableException(e);
        }
    }

    @Override
    public void meetOther(QueryModelNode node) throws RepositoryException {
        if (node instanceof MpOwnedTupleExpr) {
            meetOwnedTupleExpr((MpOwnedTupleExpr) node);
        } else if (node instanceof NaryJoin) {
            meetMultiJoin((NaryJoin) node);
        } else {
            super.meetOther(node);
        }
    }

    private void meetOwnedTupleExpr(MpOwnedTupleExpr node) throws RepositoryException {
        
        String pattern;
        Map<String, String> variables = Maps.newHashMap();

        try {
            ParsedQueryPreprocessor pqv = new ParsedQueryPreprocessor();

            SerializableParsedTupleQuery stq = pqv.transformToSerialize(node.getArg());

            PreprocessedQuerySerializer serializer = new PreprocessedQuerySerializer();
            
            Set<String> bnames = this.getOutgoingBindingNames(node);
            
            StringBuilder projectionBuilder = new StringBuilder();
            StringBuilder patternBuilder = new StringBuilder();
            if (!bnames.isEmpty()) {
                for (String bname : bnames) {
                    variables.put(bname, safe(bname));
                    projectionBuilder.append("?");
                    projectionBuilder.append(bname);
                    projectionBuilder.append(" ");
                }
                patternBuilder.append("SELECT ");
                patternBuilder.append(projectionBuilder);
            } else {
                patternBuilder.append("ASK ");
            }
            patternBuilder.append(" WHERE { ");
            patternBuilder.append(serializer.serialize(stq));
            patternBuilder.append("}");
            pattern = patternBuilder.toString();
        } catch (Exception e) {
            throw new RepositoryException(e);
        }
        node.prepare(QueryLanguage.SPARQL, pattern, variables);
         
    }

    protected void meetMultiJoin(NaryJoin node) throws RepositoryException {
        for (TupleExpr arg : node.getArgs()) {
            arg.visit(this);
        }
    }

    private String safe(String name) {
        return name.replace('-', '_');
    }


    private Set<String> getOutgoingBindingNames(TupleExpr tupleExpr) {
        Set<String> allBindingNames = tupleExpr.getBindingNames();
        VariableRetrievingVisitor visitor = new VariableRetrievingVisitor();
        List<Var> vars = visitor.retrieveInvolvedVariables(this.root, Sets.newHashSet(tupleExpr));
        Set<String> varNames = vars.stream().filter(
            var -> !var.hasValue()).map(var -> var.getName()).collect(Collectors.toSet());
        allBindingNames.retainAll(varNames);
        return allBindingNames;
    }
    
}