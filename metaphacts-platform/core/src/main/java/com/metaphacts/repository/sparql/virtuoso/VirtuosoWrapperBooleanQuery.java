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

package com.metaphacts.repository.sparql.virtuoso;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.sparql.query.QueryStringUtil;

/**
 * An implementation of {@link BooleanQuery} for 
 * a {@link VirtuosoWrapperRepository}. Takes a {@TupleQuery} as a delegate,
 * evaluates it and returns True if the result set is not empty and False 
 * otherwise.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperBooleanQuery implements BooleanQuery {
    
    protected final TupleQuery delegate;
    protected final String queryString;

    public VirtuosoWrapperBooleanQuery(String queryString, TupleQuery delegate) {
        this.delegate = delegate;
        this.queryString = queryString;
    }

    @Override
    public boolean evaluate() throws QueryEvaluationException {
        boolean returnedTrue = false; 
        try (TupleQueryResult tq = delegate.evaluate()) {
            // The result must be fully consumed before closing.
            // Otherwise, HTTP connection hangs.
            // Anyway, the delegate SELECT query must have a LIMIT 1 modifier.
            while (tq.hasNext()) {
                tq.next();
                returnedTrue = true;
            }
        };
        return returnedTrue;
    }

    public String getQueryString() {
        return QueryStringUtil.getQueryString(queryString, getBindings());
    }

    @Override
    public void setMaxQueryTime(int maxQueryTime) {
        delegate.setMaxQueryTime(maxQueryTime);        
    }

    @Override
    public int getMaxQueryTime() {
        return delegate.getMaxQueryTime();
    }

    @Override
    public void setBinding(String name, Value value) {
        delegate.setBinding(name, value);
    }

    @Override
    public void removeBinding(String name) {
        delegate.removeBinding(name);
    }

    @Override
    public void clearBindings() {
        delegate.clearBindings();
    }

    @Override
    public BindingSet getBindings() {
        return delegate.getBindings();
    }

    @Override
    public void setDataset(Dataset dataset) {
        delegate.setDataset(dataset);
    }

    @Override
    public Dataset getDataset() {
        return delegate.getDataset();
    }

    @Override
    public void setIncludeInferred(boolean includeInferred) {
        delegate.setIncludeInferred(includeInferred);
    }

    @Override
    public boolean getIncludeInferred() {
        return delegate.getIncludeInferred();
    }

    @Override
    public void setMaxExecutionTime(int maxExecTime) {
        delegate.setMaxExecutionTime(maxExecTime);        
    }

    @Override
    public int getMaxExecutionTime() {
        return delegate.getMaxExecutionTime();
    }
}
