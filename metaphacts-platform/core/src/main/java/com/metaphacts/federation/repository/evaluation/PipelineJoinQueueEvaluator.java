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

import java.util.Set;

import org.apache.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * Worker for evaluating a join queue from {@link ParallelTimeEstimatingPullBoundRankJoin}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class PipelineJoinQueueEvaluator implements Runnable {
    
    public static Logger logger = Logger.getLogger(PipelineJoinQueueEvaluator.class);

    protected final ParallelTimeEstimatingPullBoundRankJoin parentJoin;
    protected final TupleExpr seed;
    protected final MpFederationStrategy strategy;
    protected final CloseableIteration<BindingSet, QueryEvaluationException> leftIter;
    protected final TupleExpr rightArg;
    protected final BindingSet bindings;
    protected final Set<String> collectedBindingNames;

    public PipelineJoinQueueEvaluator(ParallelTimeEstimatingPullBoundRankJoin join,
            MpFederationStrategy strategy, TupleExpr seed,
            CloseableIteration<BindingSet, QueryEvaluationException> leftIter, TupleExpr rightArg,
            BindingSet bindings, Set<String> collectedBindingNames) {
        this.parentJoin = join;
        this.seed = seed;
        this.strategy = strategy;
        this.leftIter = leftIter;
        this.rightArg = rightArg;
        this.bindings = bindings;
        this.collectedBindingNames = collectedBindingNames;
    }

    public ParallelTimeEstimatingPullBoundRankJoin getParentJoin() {
        return parentJoin;
    }

    public TupleExpr getSeed() {
        return seed;
    }

    @Override
    public void run() {
        logger.trace("Triggered joining: " + rightArg.toString());
        CloseableIteration<BindingSet, QueryEvaluationException> result;
        if (leftIter != null) {
            result = strategy.evaluateJoin(leftIter, rightArg, collectedBindingNames);
        } else {
            result = strategy.evaluate(rightArg, bindings);
        }
        
        result = new MaterializedIteration(result);
        
        parentJoin.operationFinishCallback(this, rightArg, result);
    }

}