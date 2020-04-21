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

/**
 * Iteration for supporting rank joins (contains the orderNr of this iteration
 * in the queue)
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class RankJoinIteration implements CloseableIteration<BindingSet, QueryEvaluationException> {

    protected final CloseableIteration<BindingSet, QueryEvaluationException> delegate;
    protected final int orderNr;

    public RankJoinIteration(CloseableIteration<BindingSet, QueryEvaluationException> delegate, int orderNr) {
        this.delegate = delegate;
        this.orderNr = orderNr;
    }

    @Override
    public boolean hasNext() throws QueryEvaluationException {
        return delegate.hasNext();
    }

    @Override
    public BindingSet next() throws QueryEvaluationException {
        return delegate.next();
    }

    @Override
    public void remove() throws QueryEvaluationException {
        delegate.remove();
    }

    @Override
    public void close() throws QueryEvaluationException {
        delegate.close();
    }

    /**
     * @return the orderNr
     */
    public int getOrderNr() {
        return orderNr;
    }

    public CloseableIteration<BindingSet, QueryEvaluationException> getDelegate() {
        return delegate;
    }

}