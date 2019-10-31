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
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.apache.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.AbstractCloseableIteration;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.LookAheadIteration;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.impl.QueueCursor;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

/**
 * Iteration for processing parallel async join.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ParallelAsyncJoinCursor
        extends LookAheadIteration<BindingSet, QueryEvaluationException> implements Runnable {

    public static Logger logger = Logger.getLogger(ParallelAsyncJoinCursor.class);
    

    protected static final int NUM_THREADS = 40;

    private final MpFederationStrategy strategy;

    private final TupleExpr rightArg;

    // private volatile Thread evaluationThread;

    private volatile ThreadPoolExecutor executor;

    private final CloseableIteration<BindingSet, QueryEvaluationException> leftIter;

    private volatile CloseableIteration<BindingSet, QueryEvaluationException> rightIter;

    private volatile AtomicInteger counter = new AtomicInteger(0);

    private volatile AtomicBoolean allSubmitted = new AtomicBoolean(false);

    /**
     * @deprecated Use {@link AbstractCloseableIteration#isClosed()} instead.
     */
    private volatile boolean closed;

    private final QueueCursor<CloseableIteration<BindingSet, QueryEvaluationException>> rightQueue = new QueueCursor<CloseableIteration<BindingSet, QueryEvaluationException>>(
            1024);

    private final List<CloseableIteration<BindingSet, QueryEvaluationException>> toCloseList = new ArrayList<>();


    public ParallelAsyncJoinCursor(MpFederationStrategy strategy,
            CloseableIteration<BindingSet, QueryEvaluationException> leftIter, TupleExpr rightArg)
            throws QueryEvaluationException {
        super();
        this.strategy = strategy;
        this.leftIter = leftIter;
        this.rightArg = rightArg;
    }

    @Override
    public void run() {
        try {
            executor = (ThreadPoolExecutor) Executors.newFixedThreadPool(NUM_THREADS);
            while (!isClosed() && leftIter.hasNext()) {
                BindingSet next = leftIter.next();
                AsyncJoinEvaluator task = new AsyncJoinEvaluator(this, strategy, rightArg,
                        next);
                executor.submit(task);
                counter.incrementAndGet();
                // toCloseList.add(evaluate);
                // rightQueue.put(evaluate);
            }
            allSubmitted.set(true);
            logger.debug("Submitted all: " + counter.get());
        } catch (RuntimeException e) {
            logger.trace("sumbission exception: " + e.getMessage(), e);
            rightQueue.toss(e);
            close();
        } finally {
            executor.shutdown();
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
        logger.trace("handleClose invoked");

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
                            executor.shutdownNow();
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
        return "ParallelAsyncJoin\n\t" + left + "\n\t" + right.replace("\n", "\n\t");
    }

    public void operationFinishCallback(AsyncJoinEvaluator evaluator,
            CloseableIteration<BindingSet, QueryEvaluationException> result) {

        synchronized (this) {
            toCloseList.add(result);
            int countDown = counter.decrementAndGet();
            try {
                rightQueue.put(result);
                logger.trace("Received: " + countDown);
            } catch (RuntimeException e) {
                rightQueue.toss(e);
                logger.trace("Closing: " + e.getMessage(), e);
                close();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                close();
            }

            if (allSubmitted.get() && countDown == 0) {
                rightQueue.done();
                executor.shutdown();
            }

        }

    }

}