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

package org.researchspace.sail.virtuoso;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.BindingAssigner;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSailConnection;
import org.researchspace.sparql.keyword.virtuoso.VirtuosoKeywordSearchGroupExtractor;
import org.researchspace.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler;

import com.google.common.collect.Lists;

/**
 * Custom {@link SailConnection} implementation to process full-text search
 * queries for the Virtuoso repository.
 * 
 * Assumes the predicates &lt;bif:contains&gt; and &lt;bif:score&gt; to be used
 * to express the full-text search clause. (see
 * {@link VirtuosoKeywordSearchHandler}).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
@Deprecated
public class VirtuosoKeywordSearchSailConnection extends AbstractSailConnection {

    VirtuosoKeywordSearchSail theSail;
    RepositoryConnection delegateConnection;

    public VirtuosoKeywordSearchSailConnection(VirtuosoKeywordSearchSail sail) {
        super(sail);
        this.theSail = sail;
        delegateConnection = theSail.getVirtuosoRepository().getConnection();
    }

    @Override
    protected void closeInternal() throws SailException {
        try {
            delegateConnection.close();
        } catch (RepositoryException e) {
            throw new SailException(e);
        }
    }

    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> evaluateInternal(TupleExpr tupleExpr,
            Dataset dataset, BindingSet bindings, boolean includeInferred) throws SailException {
        TupleExpr cloned = tupleExpr.clone();
        // Apply the provided binding sets
        new BindingAssigner().optimize(cloned, dataset, bindings);

        VirtuosoKeywordSearchGroupExtractor extractor = new VirtuosoKeywordSearchGroupExtractor();

        extractor.optimize(tupleExpr, dataset, bindings);

        if (extractor.containsKeywordClauses()) {
            return this.evaluateAtTarget(extractor.getTupleExpr(), dataset, bindings, includeInferred);
        } else {
            return this.evaluateAtTarget(cloned, dataset, bindings, includeInferred);
        }
    }

    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> evaluateAtTarget(TupleExpr tupleExpr,
            Dataset dataset, BindingSet bindings, boolean includeInferred) throws SailException {
        RepositoryConnection connection = theSail.getVirtuosoRepository().getConnection();
        VirtuosoKeywordSearchHandler handler = new VirtuosoKeywordSearchHandler();
        try {
            return handler.evaluateKeywordSearchQuery(connection, tupleExpr, dataset, includeInferred);
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    @Override
    protected CloseableIteration<? extends Resource, SailException> getContextIDsInternal() throws SailException {
        return new CollectionIteration<Resource, SailException>(Lists.<Resource>newArrayList());
    }

    @Override
    protected CloseableIteration<? extends Statement, SailException> getStatementsInternal(Resource subj, IRI pred,
            Value obj, boolean includeInferred, Resource... contexts) throws SailException {
        throw new UnsupportedOperationException("Cannot retrieve statements by the pattern [" + subj + "," + pred + ","
                + obj + "]: only complete full text search clauses are accepted");
    }

    @Override
    protected long sizeInternal(Resource... contexts) throws SailException {
        // TODO Auto-generated method stub
        return 0;
    }

    @Override
    protected void startTransactionInternal() throws SailException {

    }

    @Override
    protected void commitInternal() throws SailException {

    }

    @Override
    protected void rollbackInternal() throws SailException {
    }

    @Override
    protected void addStatementInternal(Resource subj, IRI pred, Value obj, Resource... contexts) throws SailException {
    }

    @Override
    protected void removeStatementsInternal(Resource subj, IRI pred, Value obj, Resource... contexts)
            throws SailException {
    }

    @Override
    protected void clearInternal(Resource... contexts) throws SailException {

    }

    @Override
    protected CloseableIteration<? extends Namespace, SailException> getNamespacesInternal() throws SailException {
        return new CollectionIteration<Namespace, SailException>(Lists.<Namespace>newArrayList());
    }

    @Override
    protected String getNamespaceInternal(String prefix) throws SailException {
        return null;
    }

    @Override
    protected void setNamespaceInternal(String prefix, String name) throws SailException {

    }

    @Override
    protected void removeNamespaceInternal(String prefix) throws SailException {

    }

    @Override
    protected void clearNamespacesInternal() throws SailException {
    }

    @Override
    public boolean pendingRemovals() {
        return false;
    }

}