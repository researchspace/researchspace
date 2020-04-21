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

import org.eclipse.rdf4j.common.iteration.Iteration;
import org.eclipse.rdf4j.common.iteration.IterationWrapper;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.query.Binding;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.researchspace.federation.sparql.MpOwnedTupleExpr;

/**
 * {@link IterationWrapper} for processing the Bind-Nested Loop Join operator.
 * (See {@link ParallelBoundJoin},
 * {@link MpOwnedTupleExpr#evaluate(org.eclipse.rdf4j.query.Dataset, List, java.util.Set)}.)
 * The list of {@link BindingSet}s from the left operand is passed via
 * constructor.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MergeByIndexInsertBindingSetCursor extends IterationWrapper<BindingSet, QueryEvaluationException> {

    private final List<BindingSet> toJoin;

    public MergeByIndexInsertBindingSetCursor(Iteration<? extends BindingSet, ? extends QueryEvaluationException> iter,
            List<BindingSet> toJoin) {
        super(iter);
        this.toJoin = toJoin;
    }

    @Override
    public BindingSet next() throws QueryEvaluationException {
        BindingSet next = super.next();
        MapBindingSet result;
        if (next == null) {
            result = null; // NOPMD
        } else {
            result = new MapBindingSet();
            int idx = -1;
            for (Binding binding : next) {
                if (binding.getName().equals("__index")) {
                    idx = ((Literal) binding.getValue()).intValue();
                } else {
                    result.addBinding(binding);
                }
            }
            if (idx > -1) {
                BindingSet bs2 = toJoin.get(idx);
                for (Binding b2 : bs2) {
                    if (!result.hasBinding(b2.getName())) {
                        result.addBinding(b2);
                    }
                }
            }
        }
        return result;
    }

}