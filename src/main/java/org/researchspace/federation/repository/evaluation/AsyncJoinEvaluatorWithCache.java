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

import java.util.List;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.UnionIteration;
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

    public AsyncJoinEvaluatorWithCache(ParallelAsyncJoinCursorWithCache join, MpFederationStrategy strategy,
            TupleExpr rightArg, List<BindingSet> bindings, BindingSet key) {
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