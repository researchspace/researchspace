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

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * An evaluator worker for performing bound join in an async way.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class AsyncJoinEvaluator implements Runnable {

    protected final ParallelAsyncJoinCursor parentJoin;
    protected final MpFederationStrategy strategy;
    protected final TupleExpr rightArg;
    protected final BindingSet bindings;

    public AsyncJoinEvaluator(ParallelAsyncJoinCursor join, MpFederationStrategy strategy, TupleExpr rightArg,
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