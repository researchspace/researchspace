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

import java.util.List;
import java.util.Optional;

import org.eclipse.rdf4j.model.impl.BooleanLiteral;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

import com.google.common.collect.Lists;
import com.metaphacts.federation.sparql.FederationSparqlAlgebraUtils;
import com.metaphacts.federation.sparql.SparqlAlgebraUtils;
import com.metaphacts.federation.sparql.optimizers.RemoveNodeQueryModelVisitor;
import com.metaphacts.repository.MpRepositoryVocabulary;

/**
 * Extracts the query hints from the query tree, then deletes them from the tree.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class QueryHintsExtractor implements QueryOptimizer {
    
    private boolean disableReordering = false;
    private List<TupleExpr> toExecuteFirst = Lists.newArrayList();
    private List<TupleExpr> toExecuteLast = Lists.newArrayList();

    public QueryHintsExtractor() {

    }

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        List<StatementPattern> queryHintPatterns = FederationSparqlAlgebraUtils.extractQueryHintsPatterns(tupleExpr);

        for (StatementPattern hint : queryHintPatterns) {
            if (SparqlAlgebraUtils.statementPatternMatches(hint, MpRepositoryVocabulary.PRIOR,
                    MpRepositoryVocabulary.EXECUTE_FIRST, BooleanLiteral.TRUE)) {
                Optional<TupleExpr> prevNode = getPreviousJoinOperand(hint);
                if (prevNode.isPresent()) {
                    this.toExecuteFirst.add(prevNode.get());
                }
            } else if (SparqlAlgebraUtils.statementPatternMatches(hint, MpRepositoryVocabulary.PRIOR,
                    MpRepositoryVocabulary.EXECUTE_LAST, BooleanLiteral.TRUE)) {
                Optional<TupleExpr> prevNode = getPreviousJoinOperand(hint);
                if (prevNode.isPresent()) {
                    this.toExecuteLast.add(prevNode.get());
                }
            } else if (SparqlAlgebraUtils.statementPatternMatches(hint, MpRepositoryVocabulary.QUERY,
                    MpRepositoryVocabulary.DISABLE_JOIN_REORDERING, BooleanLiteral.TRUE)) {
                this.disableReordering = true;
            } 
        }
        
        for (StatementPattern hint : queryHintPatterns) {
            try {
                removeHint(tupleExpr, hint);
            } catch (Exception e) {
                throw new IllegalStateException("Cannot remove the query hint: " + hint.toString()
                        + " from the query tree");
            }
        }
    }
    
    
    protected Optional<TupleExpr> getPreviousJoinOperand(StatementPattern hint) {
        if (!(hint.getParentNode() instanceof NaryJoin)) {
            return Optional.empty();
        } 
        NaryJoin parent = (NaryJoin)hint.getParentNode();
        int idx = parent.getArgs().indexOf(hint);
        if (idx > 0) {
            return Optional.of(parent.getArg(idx - 1));
        }
        return Optional.empty();
    }
    
    
    protected TupleExpr removeHint(TupleExpr tupleExpr, StatementPattern hint) throws Exception {
        RemoveNodeQueryModelVisitor visitor = new RemoveNodeQueryModelVisitor(hint);
        tupleExpr.visit(visitor);
        return tupleExpr;
    }
    
    public QueryHintsSetup getQueryHintsSetup() {
        QueryHintsSetup setup = new QueryHintsSetup();
        setup.executeFirst = this.toExecuteFirst;
        setup.executeLast = this.toExecuteLast;
        setup.disableReordering = this.disableReordering;
        return setup;
    }
}
