/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.federation.repository.evaluation;

import java.util.Set;

import org.apache.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * Worker for evaluating a join queue from
 * {@link ParallelTimeEstimatingPullBoundRankJoin}.
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

    public PipelineJoinQueueEvaluator(ParallelTimeEstimatingPullBoundRankJoin join, MpFederationStrategy strategy,
            TupleExpr seed, CloseableIteration<BindingSet, QueryEvaluationException> leftIter, TupleExpr rightArg,
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