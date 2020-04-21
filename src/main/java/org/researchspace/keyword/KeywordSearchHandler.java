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

package org.researchspace.keyword;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.sail.SailException;

/**
 * Generic interface for the triple-store-dependent services that are able to
 * process the SPARQL queries with full-text search clauses.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public interface KeywordSearchHandler {

    /**
     * Evaluates a {@link TupleExpr} which may have a
     * {@link KeywordSearchGroupTupleExpr} in its query plan using a provided
     * {@link RepositoryConnection}.
     * 
     * @param tupleExpr       a {@link TupleExpr} containing a full-text search
     *                        clause {@link KeywordSearchGroupTupleExpr} in its
     *                        decomposition tree
     * 
     * @param connection
     * @param dataset
     * @param includeInferred
     * @return
     * @throws SailException
     */
    public CloseableIteration<? extends BindingSet, QueryEvaluationException> evaluateKeywordSearchQuery(
            RepositoryConnection connection, TupleExpr tupleExpr, Dataset dataset, boolean includeInferred)
            throws SailException;
}