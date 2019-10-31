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

package com.metaphacts.federation.repository.evaluation;

import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.UnionIteration;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.sail.federation.evaluation.InsertBindingSetCursor;

import com.google.common.collect.Lists;

/**
 * Worker class for async bound join evaluation using caching of bound values 
 * (see {@link ParallelAsyncJoinCursorWithCache}).
 *  
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class AsyncJoinEvaluatorWithCache implements Runnable {

    private static final Logger logger = LogManager.getLogger(AsyncJoinEvaluatorWithCache.class);
    
    protected final ParallelAsyncJoinCursorWithCache parentJoin;
    protected final MpFederationStrategy strategy;
    protected final TupleExpr rightArg;
    protected final List<BindingSet> bindings;
    protected final BindingSet key;
    
    public AsyncJoinEvaluatorWithCache(ParallelAsyncJoinCursorWithCache join,
            MpFederationStrategy strategy, TupleExpr rightArg, List<BindingSet> bindings,
            BindingSet key) {
        this.parentJoin = join;
        this.strategy = strategy;
        this.rightArg = rightArg;
        this.bindings = bindings;
        this.key = key;
    }

    public ParallelAsyncJoinCursorWithCache getParentJoin() {
        return parentJoin;
    }

    @Override
    public void run() {
        CloseableIteration<BindingSet, QueryEvaluationException> result = null;
        try {
            if (bindings.size() == 1) {
                result = strategy.evaluate(rightArg, bindings.iterator().next());
            } else {
                MaterializedIteration etalonResult;
                etalonResult = new MaterializedIteration(strategy.evaluate(rightArg, key));
                etalonResult.close();
                List<CloseableIteration<BindingSet, QueryEvaluationException>> results = Lists
                        .newArrayListWithCapacity(bindings.size());
                for (BindingSet bs : bindings) {
                    CollectionIteration<BindingSet, QueryEvaluationException> tmpResult = new CollectionIteration<>(
                            etalonResult.list);
                    results.add(new InsertBindingSetCursor(tmpResult, bs));
                }
                result = new UnionIteration<BindingSet, QueryEvaluationException>(results);
            }
            parentJoin.operationFinishCallback(this, result);
        } catch (Exception e) {
            logger.warn(e.getMessage());
            logger.debug("Cause: ", e);
            parentJoin.operationErrorCallback(this, e);
        }
    }

    
}