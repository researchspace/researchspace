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

package org.researchspace.federation.repository;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.repository.sail.SailBooleanQuery;
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.repository.sail.SailTupleQuery;

public class FederationSailBooleanQueryWrapper extends SailBooleanQuery {

    protected final SailTupleQuery delegate;

    public FederationSailBooleanQueryWrapper(ParsedBooleanQuery originalQuery, SailTupleQuery delegate,
            SailRepositoryConnection con) {
        super(originalQuery, con);
        this.delegate = delegate;
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
        }
        ;
        return returnedTrue;
    }

    @Override
    public Dataset getActiveDataset() {
        return delegate.getActiveDataset();
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
    public void setMaxExecutionTime(int maxExecutionTime) {
        delegate.setMaxExecutionTime(maxExecutionTime);
    }

    @Override
    public int getMaxExecutionTime() {
        return delegate.getMaxExecutionTime();
    }

}
