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

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * An evaluator worker for performing  bound join in an async way.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class AsyncJoinEvaluator implements Runnable {

    protected final ParallelAsyncJoinCursor parentJoin;
    protected final MpFederationStrategy strategy;
    protected final TupleExpr rightArg;
    protected final BindingSet bindings;

    public AsyncJoinEvaluator(ParallelAsyncJoinCursor join,
            MpFederationStrategy strategy, TupleExpr rightArg,
            BindingSet bindings) {
        this.parentJoin = join;
        this.strategy = strategy;
        this.rightArg = rightArg;
        this.bindings = bindings;
    }

    public ParallelAsyncJoinCursor getParentJoin() {
        return parentJoin;
    }

    @Override
    public void run() {
        CloseableIteration<BindingSet, QueryEvaluationException> result;
        result = strategy.evaluate(rightArg, bindings);
        parentJoin.operationFinishCallback(this, result);
    }
}