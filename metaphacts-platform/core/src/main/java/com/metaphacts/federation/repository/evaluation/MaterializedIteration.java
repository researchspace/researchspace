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

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;

/**
 * Implementation of a {@link CloseableIteration} with materialization.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MaterializedIteration
        implements CloseableIteration<BindingSet, QueryEvaluationException> {

    protected final List<BindingSet> list = new LinkedList<BindingSet>();
    protected final Iterator<BindingSet> iterator;
    protected boolean closed = false;

    public MaterializedIteration(CloseableIteration<BindingSet, QueryEvaluationException> delegate)
            throws QueryEvaluationException {
        try {
            while (delegate.hasNext()) {
                list.add(delegate.next());
            }
        } finally {
            delegate.close();
        }
        iterator = list.iterator();
    }

    @Override
    public boolean hasNext() throws QueryEvaluationException {
        return !closed && iterator.hasNext();
    }

    @Override
    public BindingSet next() throws QueryEvaluationException {
        if (!closed)
            return iterator.next();
        return null;
    }

    @Override
    public void remove() throws QueryEvaluationException {
        throw new UnsupportedOperationException("Remove is not supported");
    }

    @Override
    public void close() throws QueryEvaluationException {
        closed = true;
    }

    public int size() {
        return list.size();
    }
}
