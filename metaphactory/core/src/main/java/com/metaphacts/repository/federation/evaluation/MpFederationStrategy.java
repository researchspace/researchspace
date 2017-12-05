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

package com.metaphacts.repository.federation.evaluation;

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executor;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.UnionIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.evaluation.EvaluationStrategy;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolver;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.sail.federation.MpReadOnlyFederationConnection;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.eclipse.rdf4j.sail.federation.evaluation.FederationStrategy;
import org.eclipse.rdf4j.sail.federation.evaluation.ParallelJoinCursor;

import com.google.common.collect.Maps;
import com.metaphacts.repository.federation.MpFederation;
import com.metaphacts.sparql.MpOwnedTupleExpr;
import com.metaphacts.sparql.renderer.MpSparqlQueryRenderer;

/**
 * {@link EvaluationStrategy} implementation for {@link MpReadOnlyFederationConnection}
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpFederationStrategy extends FederationStrategy {
    
    protected final MpFederation federation;

    public MpFederationStrategy(MpFederation federation, TripleSource tripleSource, Dataset dataset,
            FederatedServiceResolver serviceManager) {
        super(federation, tripleSource, dataset, serviceManager);
        this.federation = federation;
    }

    /**
     * Evaluates a {@link TupleExpr} by sending it as a separate query to a single target member.
     * 
     * @param expr
     * @param bindings
     * @param owner
     * @return
     * @throws QueryEvaluationException
     */
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluateAtSingleOwner(
            TupleExpr expr, BindingSet bindings, RepositoryConnection owner)
            throws QueryEvaluationException {
        // Single owner query
        MpOwnedTupleExpr owned = new MpOwnedTupleExpr(owner, expr);
        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        try {
            String renderedQuery = renderer.render(expr);
            Map<String, String> varNames = Maps.newHashMap();
            for (String bindingName : bindings.getBindingNames()) {
                varNames.put(bindingName, bindingName);
            }
            owned.prepare(QueryLanguage.SPARQL, renderedQuery, varNames);
            // Explicit cast because the method evaluate(OwnedTupleExpr, BindingSet)
            // is private in the superclass.
            return evaluate((MpOwnedTupleExpr) owned, bindings);
        } catch (Exception e) {
            throw new QueryEvaluationException(
                    "Error while executing a single-owner query: " + e.getMessage(), e);
        }
    }

    /**
     * Execute NaryJoin using only nested loop joins.
     * 
     */
    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(NaryJoin join,
            BindingSet bindings) throws QueryEvaluationException {
        assert join.getNumberOfArguments() > 0;
        CloseableIteration<BindingSet, QueryEvaluationException> result = evaluate(join.getArg(0),
                bindings);
        Set<String> collectedBindingNames = new HashSet<>();
        collectedBindingNames.addAll(join.getArg(0).getBindingNames());
        for (int i = 1, n = join.getNumberOfArguments(); i < n; i++) {

            TupleExpr rightArg = join.getArg(i);

            if (rightArg instanceof MpOwnedTupleExpr) {
                result = new ParallelBoundJoinCursor(this, result, (MpOwnedTupleExpr) rightArg);
                federation.execute((Runnable) result);
                collectedBindingNames.addAll(rightArg.getBindingNames());
            } else {
                result = new ParallelJoinCursor(this, result, join.getArg(i)); // NOPMD
                federation.execute((Runnable) result);
                collectedBindingNames.addAll(rightArg.getBindingNames());
            }
        }
        return result;
    }

    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(TupleExpr expr,
            BindingSet bindings) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result;
        if (expr instanceof NaryJoin) {
            result = evaluate((NaryJoin) expr, bindings);
        } else if (expr instanceof MpOwnedTupleExpr) {
            result = evaluate((MpOwnedTupleExpr) expr, bindings);
        } else {
            result = super.evaluate(expr, bindings);
        }
        return result;
    }

    protected CloseableIteration<BindingSet, QueryEvaluationException> evaluate(
            MpOwnedTupleExpr expr, BindingSet bindings) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result = expr.evaluate(dataset,
                bindings);
        if (result == null) {
            TripleSource source = new org.eclipse.rdf4j.repository.evaluation.RepositoryTripleSource(
                    expr.getOwner());
            EvaluationStrategy eval = new MpFederationStrategy(federation, source, dataset,
                    serviceResolver);
            result = eval.evaluate(expr.getArg(), bindings);
        }
        return result;
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(Union union,
            BindingSet bindings) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException>[] iters 
            = new CloseableIteration[2];
        iters[0] = evaluate(union.getLeftArg(), bindings);
        iters[1] = evaluate(union.getRightArg(), bindings);
        return new UnionIteration<BindingSet, QueryEvaluationException>(iters);
    }

    protected CloseableIteration<BindingSet, QueryEvaluationException> evaluateUsingBoundJoin(
            MpOwnedTupleExpr expr, List<BindingSet> bindingSets, Set<String> boundVars)
            throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result = expr.evaluate(dataset,
                bindingSets, boundVars);
        return result;
    }

    

}