/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package org.eclipse.rdf4j.sail.federation;

import java.net.SocketException;
import java.util.List;
import java.util.Map;

import org.apache.http.MalformedChunkCodingException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.ExceptionConvertingIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.QueryRoot;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.EvaluationStrategy;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.BindingAssigner;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.CompareOptimizer;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.ConjunctiveConstraintSplitter;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.ConstantOptimizer;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.DisjunctiveConstraintOptimizer;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.SameTermFilterOptimizer;
import org.eclipse.rdf4j.query.impl.EmptyBindingSet;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.filters.AccurateRepositoryBloomFilter;
import org.eclipse.rdf4j.repository.filters.RepositoryBloomFilter;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.PrefixHashSet;
import org.eclipse.rdf4j.sail.federation.ReadOnlyConnection;
import org.eclipse.rdf4j.sail.federation.algebra.OwnedTupleExpr;
import org.eclipse.rdf4j.sail.federation.optimizers.EmptyPatternOptimizer;
import org.eclipse.rdf4j.sail.federation.optimizers.FederationJoinOptimizer;
import org.eclipse.rdf4j.sail.federation.optimizers.MpOwnedTupleExprPruner;
import org.eclipse.rdf4j.sail.federation.optimizers.OwnedTupleExprPruner;
import org.eclipse.rdf4j.sail.federation.optimizers.PrepareOwnedTupleExpr;
import org.eclipse.rdf4j.sail.federation.optimizers.QueryModelPruner;
import org.eclipse.rdf4j.sail.federation.optimizers.QueryMultiJoinOptimizer;

import com.google.common.collect.ImmutableList;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.federation.MpFederation;
import com.metaphacts.repository.federation.evaluation.MpFederationStrategy;
import com.metaphacts.repository.federation.optimizers.MpFederationJoinOptimizer;
import com.metaphacts.repository.federation.optimizers.MpPrepareOwnedTupleExpr;
import com.metaphacts.repository.federation.optimizers.MpQueryMultiJoinOptimizer;
import com.metaphacts.sparql.FederationSparqlAlgebraUtils;
import com.metaphacts.sparql.renderer.MpSparqlQueryRenderer;

import com.google.common.collect.Maps;

/**
 * 
 * Implementation of a {@link SailConnection} for an {@link MpFederation}.
 * Assumes an explicit SPARQL 1.1. federation, and not a transparent one:
 * i.e., there is one default federation member, while all others must be accessed 
 * via SPARQL 1.1 SERVICE clauses. 
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpReadOnlyFederationConnection extends ReadOnlyConnection {

    private static final Logger logger = LogManager.getLogger(MpReadOnlyFederationConnection.class);

    private class MpFederationTripleSource implements TripleSource {

        private final boolean inf;

        public MpFederationTripleSource(boolean includeInferred) {
            this.inf = includeInferred;
        }

        public CloseableIteration<? extends Statement, QueryEvaluationException> getStatements(
                Resource subj, IRI pred, Value obj, Resource... contexts)
                throws QueryEvaluationException {
            try {
                CloseableIteration<? extends Statement, SailException> result = MpReadOnlyFederationConnection.this
                        .getStatements(subj, pred, obj, inf, contexts);
                return new ExceptionConvertingIteration<Statement, QueryEvaluationException>(
                        result) {

                    @Override
                    protected QueryEvaluationException convert(Exception exception) {
                        return new QueryEvaluationException(exception);
                    }

                    @Override
                    protected void handleClose() throws QueryEvaluationException {
                        try {
                            super.handleClose();
                        } catch (Exception e) {
                            Throwable rootCause = getRootCause(e);
                            if ((rootCause instanceof MalformedChunkCodingException)
                                    || (rootCause instanceof IndexOutOfBoundsException)
                                    || (rootCause instanceof SocketException)) {
                                // Just suppress it: the stream is already closed
                            } else {
                                throw e;
                            }
                        }
                    }

                    private Throwable getRootCause(Throwable e) {
                        Throwable cause = e.getCause();
                        return cause != null ? getRootCause(cause) : e;
                    }
                };
            } catch (SailException e) {
                throw new QueryEvaluationException(e);
            }
        }

        public ValueFactory getValueFactory() {
            return MpReadOnlyFederationConnection.this.getValueFactory();
        }
    }

    protected MpFederation mpFederation;

    public MpReadOnlyFederationConnection(MpFederation federation,
            List<RepositoryConnection> members) {
        super(federation, members);
        this.mpFederation = federation;
    }

    public List<RepositoryConnection> getMembers() {
        return members;
    }

    @Override
    public CloseableIteration<? extends BindingSet, QueryEvaluationException> evaluateInternal(
            TupleExpr query, Dataset dataset, BindingSet bindings, boolean inf)
            throws SailException {
        TripleSource tripleSource = new MpFederationTripleSource(inf);
        MpFederationStrategy strategy = mpFederation.createEvaluationStrategy(tripleSource, dataset);

        RepositoryConnection owner = FederationSparqlAlgebraUtils.getSingleOwner(query,
                mpFederation.getServiceMappings(), members.get(0));
        if (owner != null && owner.equals(members.get(0))) {
            // Single owner query
            try {
                return strategy.evaluateAtSingleOwner(query, bindings, owner);
            } catch (Exception e) {
                throw new SailException(
                        "Error while executing a single-owner query: " + e.getMessage(), e);
            }
        }
        TupleExpr qry = optimize(query, dataset, bindings, inf, strategy);
        try {
            return strategy.evaluate(qry, EmptyBindingSet.getInstance());
        } catch (QueryEvaluationException e) {
            throw new SailException(e);
        }
    }

    private TupleExpr optimize(TupleExpr parsed, Dataset dataset, BindingSet bindings,
            boolean includeInferred, EvaluationStrategy strategy) throws SailException {
        logger.trace("Incoming query model:\n{}", parsed);

        // Clone the tuple expression to allow for more aggressive optimisations
        TupleExpr query = new QueryRoot(parsed.clone());

        new BindingAssigner().optimize(query, dataset, bindings);
        new ConstantOptimizer(strategy).optimize(query, dataset, bindings);
        new CompareOptimizer().optimize(query, dataset, bindings);
        new ConjunctiveConstraintSplitter().optimize(query, dataset, bindings);
        new DisjunctiveConstraintOptimizer().optimize(query, dataset, bindings);
        new SameTermFilterOptimizer().optimize(query, dataset, bindings);
        new QueryModelPruner().optimize(query, dataset, bindings);

        new MpQueryMultiJoinOptimizer().optimize(query, dataset, bindings);
        // new FilterOptimizer().optimize(query, dataset, bindings);

        // prepare bloom filters
        RepositoryBloomFilter defaultBloomFilter = new AccurateRepositoryBloomFilter(
                includeInferred);
        Map<Repository, RepositoryBloomFilter> bloomFilters = mpFederation.getBloomFilters();
        java.util.function.Function<Repository, RepositoryBloomFilter> bloomFilterFunction = c -> bloomFilters
                .getOrDefault(c, defaultBloomFilter);

        // new EmptyPatternOptimizer(members, bloomFilterFunction).optimize(query, dataset,
        // bindings);
        boolean distinct = mpFederation.isDistinct();
        PrefixHashSet local = mpFederation.getLocalPropertySpace();

        MpFederationJoinOptimizer fedJoinOptimizer = new MpFederationJoinOptimizer(members,
                members.get(0), distinct, local, mpFederation.getServiceMappings(),
                bloomFilterFunction);
        fedJoinOptimizer.optimize(query, dataset, bindings);
        fedJoinOptimizer.isSingleOwnerQuery();

        new MpOwnedTupleExprPruner().optimize(query, dataset, bindings);
        new QueryModelPruner().optimize(query, dataset, bindings);
        new MpQueryMultiJoinOptimizer().optimize(query, dataset, bindings);

        // new PrepareOwnedTupleExpr().optimize(query, dataset, bindings);
        new MpPrepareOwnedTupleExpr().optimize(query, dataset, bindings);

        logger.trace("Optimized query model:\n{}", query);
        return query;
    }

}