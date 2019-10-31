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

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.common.iteration.AbstractCloseableIteration;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.LookAheadIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.impl.QueueCursor;
import org.eclipse.rdf4j.sail.federation.evaluation.ParallelJoinCursor;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.federation.sparql.MpOwnedTupleExpr;

/**
 * A modification of the RDF4J {@link ParallelJoinCursor} by James Leigh. Iterate the left side and
 * evaluate the right side in separate thread using the bound-nested loop join, only iterate the
 * right side in the controlling thread.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class ParallelBoundJoinCursor
        extends LookAheadIteration<BindingSet, QueryEvaluationException> implements Runnable {

    /*-----------*
     * Constants *
     *-----------*/

    public static final int BOUND_JOIN_BLOCK_SIZE = 10;

    protected final MpFederationStrategy strategy;

    protected final MpOwnedTupleExpr rightArg;

    /*-----------*
     * Variables *
     *-----------*/

    private volatile Thread evaluationThread;

    private final CloseableIteration<BindingSet, QueryEvaluationException> leftIter;

    private volatile CloseableIteration<BindingSet, QueryEvaluationException> rightIter;

    /**
     * @deprecated Use {@link AbstractCloseableIteration#isClosed()} instead.
     */
    private volatile boolean closed;

    private final QueueCursor<CloseableIteration<BindingSet, QueryEvaluationException>> rightQueue = new QueueCursor<CloseableIteration<BindingSet, QueryEvaluationException>>(
            1024);

    private final List<CloseableIteration<BindingSet, QueryEvaluationException>> toCloseList = new ArrayList<>();

    /*--------------*
     * Constructors *
     *--------------*/

    public ParallelBoundJoinCursor(MpFederationStrategy strategy,
            CloseableIteration<BindingSet, QueryEvaluationException> leftIter,
            MpOwnedTupleExpr rightArg) throws QueryEvaluationException {
        super();
        this.strategy = strategy;
        this.leftIter = leftIter;
        this.rightArg = rightArg;
    }

    /*---------*
     * Methods *
     *---------*/

    @Override
    public void run() {
        evaluationThread = Thread.currentThread();

        int totalLeftBindingsProcessed = 0;

        try {
            if (!isClosed() && leftIter.hasNext()) {
                BindingSet nextBs = leftIter.next();
                totalLeftBindingsProcessed++;
                CloseableIteration<BindingSet, QueryEvaluationException> evaluate = strategy
                        .evaluate(rightArg, nextBs);
                toCloseList.add(evaluate);
                rightQueue.put(evaluate);
            }

            int bindingsBlockSize;
            List<BindingSet> bindingSets = null;

            Set<String> boundVars = Sets.newHashSet();
            while (!isClosed() && leftIter.hasNext()) {

                if (totalLeftBindingsProcessed > BOUND_JOIN_BLOCK_SIZE) {
                    bindingsBlockSize = BOUND_JOIN_BLOCK_SIZE;
                } else {
                    bindingsBlockSize = 3;
                }

                bindingSets = Lists.newArrayListWithCapacity(bindingsBlockSize);
                boundVars.clear();
                int count = 0;
                while (count < bindingsBlockSize && leftIter.hasNext()) {
                    BindingSet nextLeft = leftIter.next();
                    boundVars.addAll(nextLeft.getBindingNames());
                    bindingSets.add(nextLeft);
                    count++;
                }

                totalLeftBindingsProcessed += count;

                CloseableIteration<BindingSet, QueryEvaluationException> evaluate = strategy
                        .evaluateUsingBoundJoin(rightArg, bindingSets, boundVars);
                toCloseList.add(evaluate);
                rightQueue.put(evaluate);
            }
        } catch (RuntimeException e) {
            rightQueue.toss(e);
            close();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            close();
        } finally {
            evaluationThread = null;
            rightQueue.done();
        }
    }

    @Override
    public BindingSet getNextElement() throws QueryEvaluationException {
        BindingSet result = null;
        CloseableIteration<BindingSet, QueryEvaluationException> nextRightIter = rightIter;
        while (!isClosed() && (nextRightIter != null || rightQueue.hasNext())) {
            if (nextRightIter == null) {
                nextRightIter = rightIter = rightQueue.next();
            }
            if (nextRightIter != null) {
                if (nextRightIter.hasNext()) {
                    result = nextRightIter.next();
                    break;
                } else {
                    nextRightIter.close();
                    nextRightIter = rightIter = null;
                }
            }
        }

        return result;
    }

    @Override
    public void handleClose() throws QueryEvaluationException {
        closed = true;
        try {
            super.handleClose();
        } finally {
            try {
                CloseableIteration<BindingSet, QueryEvaluationException> toCloseRightIter = rightIter;
                rightIter = null;
                if (toCloseRightIter != null) {
                    toCloseRightIter.close();
                }
            } finally {
                try {
                    leftIter.close();
                } finally {
                    try {
                        rightQueue.close();
                    } finally {
                        try {
                            for (CloseableIteration<BindingSet, QueryEvaluationException> nextToCloseIteration : toCloseList) {
                                try {
                                    nextToCloseIteration.close();
                                } catch (Exception e) {
                                    // Ignoring exceptions while closing component iterations
                                }
                            }
                        } finally {
                            Thread toCloseEvaluationThread = evaluationThread;
                            if (toCloseEvaluationThread != null) {
                                toCloseEvaluationThread.interrupt();
                            }
                        }
                    }
                }
            }
        }
    }

    @Override
    public String toString() {
        String left = leftIter.toString().replace("\n", "\n\t");
        CloseableIteration<BindingSet, QueryEvaluationException> nextRightIter = rightIter;
        String right = (null == nextRightIter) ? rightArg.toString() : nextRightIter.toString();
        return "ParallelBoundNestedLoopJoin\n\t" + left + "\n\t" + right.replace("\n", "\n\t");
    }
}