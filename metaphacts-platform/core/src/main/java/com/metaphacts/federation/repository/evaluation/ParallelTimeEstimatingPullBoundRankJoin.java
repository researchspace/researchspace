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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.concurrent.CountDownLatch;

import org.apache.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.HashJoinIteration;
import org.eclipse.rdf4j.query.algebra.evaluation.util.ValueComparator;
import org.eclipse.rdf4j.query.impl.MapBindingSet;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.metaphacts.federation.sparql.rank.optimizers.NaryJoinOrderOptimizerHelper;
import com.google.common.collect.Lists;

/**
 * Implementation of the parallel competing pull-bound rank join (see FedSearch paper). 
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ParallelTimeEstimatingPullBoundRankJoin {

    public static Logger log = Logger.getLogger(ParallelTimeEstimatingPullBoundRankJoin.class);

    /* Constants */
    protected final MpFederationStrategy strategy; // the evaluation strategy
    protected final List<TupleExpr> seeds;
    protected final List<TupleExpr> unsortedArgs;
    // protected final BindingSet bindings; // the bindings
    protected final BindingSet bindings;
    protected final List<OrderElem> orderElements;
    protected final List<Set<String>> joinVars = new ArrayList<Set<String>>();
    protected final long limit;

    protected final MpOrderComparator orderComparator;
    // protected Map<BindingSet, List<BindingSet>> leftHashMap = new HashMap<BindingSet,
    // List<BindingSet>>();
    // protected Map<BindingSet, List<BindingSet>> rightHashMap = new HashMap<BindingSet,
    // List<BindingSet>>();

    protected final List<List<TupleExpr>> alreadyJoinedLists = new ArrayList<List<TupleExpr>>();

    protected Map<TupleExpr, List<TupleExpr>> remainingQueues = Maps.newHashMap();
    protected final Map<TupleExpr, Set<String>> freeVarsSetsList = Maps.newHashMap();
    private final Set<String> allVars = new HashSet<String>();

    protected final List<TupleExpr> unjoinedUnsortedArgs;

    protected PriorityQueue<BindingSet> resultQueue;

    protected volatile CountDownLatch latch;

    protected Map<TupleExpr, CloseableIteration<BindingSet, QueryEvaluationException>> partialIterations = Maps
            .newHashMap();

    public ParallelTimeEstimatingPullBoundRankJoin(MpFederationStrategy strategy,
            List<TupleExpr> seeds, List<TupleExpr> unsortedArgs, BindingSet bindings,
            List<OrderElem> orderElements, long limit) {
        this.strategy = strategy;
        this.seeds = seeds;
        this.unsortedArgs = unsortedArgs;
        this.unjoinedUnsortedArgs = new ArrayList<TupleExpr>(unsortedArgs);
        this.bindings = bindings;
        this.orderElements = orderElements;
        this.orderComparator = new MpOrderComparator(strategy, orderElements,
                new ValueComparator());
        this.limit = limit;

        this.resultQueue = new PriorityQueue<BindingSet>(1000, this.orderComparator);
        for (int i = 0; i < seeds.size(); i++) {
            alreadyJoinedLists.add(new ArrayList<TupleExpr>());
        }
    }

    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(
            MpFederationStrategy strategy, List<TupleExpr> seeds, List<TupleExpr> unsorted,
            BindingSet bindings) {
        // Compose alternative plans
        initializeQueues();

        log.debug("Latch count: " + (seeds.size() + this.unjoinedUnsortedArgs.size()));

        latch = new CountDownLatch(seeds.size() + this.unjoinedUnsortedArgs.size());
        // Trigger executions of all alternative plans in parallel
        for (TupleExpr seed : seeds) {
            PipelineJoinQueueEvaluator evaluator = new PipelineJoinQueueEvaluator(this, strategy,
                    seed, null, seed, bindings, freeVarsSetsList.get(seed));
            strategy.getFederation().execute(evaluator);
        }
        try {
            latch.await();
        } catch (InterruptedException e) {
            log.trace(e.getMessage(), e);
        }

        if (seeds.size() == 2) {

            try {
                MaterializedIteration iter1 = (MaterializedIteration) partialIterations
                        .get(seeds.get(0));
                MaterializedIteration iter2 = (MaterializedIteration) partialIterations
                        .get(seeds.get(1));
                CollectionIteration<BindingSet, QueryEvaluationException> colIter1 = 
                        new CollectionIteration<>(
                                iter1.list);
                CollectionIteration<BindingSet, QueryEvaluationException> colIter2 = 
                        new CollectionIteration<>(
                                iter2.list);

                log.debug("iter1: " + iter1.list.get(0).getBindingNames());
                log.debug("iter2: " + iter2.list.get(0).getBindingNames());

                Set<String> freeVars1 = freeVarsSetsList.get(seeds.get(0));
                Set<String> freeVars2 = freeVarsSetsList.get(seeds.get(1));

                return new HashJoinIteration(strategy, colIter1,
                        iter1.list.get(0).getBindingNames(), colIter2,
                        iter2.list.get(0).getBindingNames(), false);
            } catch (Exception e) {
                log.debug(e.getMessage(), e);
                throw e;
            }
        } else {
            return null;
        }

    }

    protected void initializeQueues() {
        List<TupleExpr> currentJoinQueue;
        List<TupleExpr> unassigned = new ArrayList<TupleExpr>(this.unjoinedUnsortedArgs);
        for (int i = 0; i < this.seeds.size(); i++) {
            currentJoinQueue = generatePossibleJoinQueueForSortedInput(seeds.get(i));
            remainingQueues.put(seeds.get(i), currentJoinQueue);
            unassigned.removeAll(currentJoinQueue);
            this.freeVarsSetsList.put(seeds.get(i),
                    Sets.newHashSet((seeds.get(i).getBindingNames())));
            this.alreadyJoinedLists.add(new ArrayList<TupleExpr>());
        }

        if (!unassigned.isEmpty()) {
            log.trace("Remained " + unassigned.size() + " unsorted elements");
            for (List<TupleExpr> tmpQueue : remainingQueues.values()) {
                tmpQueue.addAll(unassigned);
            }
        }
    }

    protected List<TupleExpr> generatePossibleJoinQueueForSortedInput(TupleExpr expr) {

        List<TupleExpr> sortedCandidateList = new ArrayList<TupleExpr>(1);
        sortedCandidateList.add(expr);
        List<TupleExpr> optimized = new NaryJoinOrderOptimizerHelper(
                Lists.newArrayList(this.unjoinedUnsortedArgs), expr.getBindingNames())
                        .orderJoinOperands();
        Set<String> freeVars = new HashSet<String>(expr.getBindingNames());
        List<TupleExpr> result = new ArrayList<TupleExpr>();
        Set<String> tmpJoinVars = new HashSet<String>();
        for (TupleExpr tmp : optimized) {
            if (tmp.equals(expr))
                continue;
            tmpJoinVars.clear();
            tmpJoinVars.addAll(freeVars);
            tmpJoinVars.retainAll(tmp.getBindingNames());
            if (!tmpJoinVars.isEmpty()) {
                result.add(tmp);
                freeVars.addAll(tmp.getBindingNames());
            } else {
                break;
            }
        }

        return result;

    }

    public void operationFinishCallback(PipelineJoinQueueEvaluator evaluator, TupleExpr justJoined,
            CloseableIteration<BindingSet, QueryEvaluationException> result) {

        log.debug("Just joined: " + justJoined.toString() + " to branch "
                + evaluator.getSeed().toString());

        synchronized (this) {
            if (latch.getCount() <= 0) {
                return;
            }
            // Remove justJoined from all other queues
            for (Entry<TupleExpr, List<TupleExpr>> entry : remainingQueues.entrySet()) {
                entry.getValue().remove(justJoined);
            }

            Set<String> branchVars = freeVarsSetsList.get(evaluator.getSeed());
            branchVars.addAll(justJoined.getBindingNames());

            // Check if the queue has more operands left
            List<TupleExpr> ourQueue = remainingQueues.get(evaluator.getSeed());
            if (!ourQueue.isEmpty()) {
                PipelineJoinQueueEvaluator newEvaluator = new PipelineJoinQueueEvaluator(this,
                        strategy, evaluator.getSeed(), result, ourQueue.get(0), new MapBindingSet(),
                        branchVars);
                strategy.getFederation().execute(newEvaluator);
            } else {
                log.debug("Stopping branch: " + evaluator.getSeed().toString());
                // if not, stop
            }

            partialIterations.put(evaluator.getSeed(), result);
            latch.countDown();

            // if all stopped, trigger hash join

        }

    }

}