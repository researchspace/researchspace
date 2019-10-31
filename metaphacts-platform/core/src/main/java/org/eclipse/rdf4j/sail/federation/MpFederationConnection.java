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

package org.eclipse.rdf4j.sail.federation;

import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.QueryRoot;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
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
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.optimizers.MpOwnedTupleExprPruner;
import org.eclipse.rdf4j.sail.federation.optimizers.QueryModelPruner;

import com.metaphacts.federation.repository.MpFederation;
import com.metaphacts.federation.repository.evaluation.MpFederationStrategy;
import com.metaphacts.federation.repository.evaluation.RemoteClosingExceptionConvertingIteration;
import com.metaphacts.federation.repository.optimizers.MpFederationJoinOptimizer;
import com.metaphacts.federation.repository.optimizers.MpFederationJoinOptimizerWithHints;
import com.metaphacts.federation.repository.optimizers.MpFederationServiceClauseOptimizer;
import com.metaphacts.federation.repository.optimizers.MpPostJoinReorderingLocalJoinOptimizer;
import com.metaphacts.federation.repository.optimizers.MpPrepareOwnedTupleExpr;
import com.metaphacts.federation.repository.optimizers.MpQueryHintsSyncOptimizer;
import com.metaphacts.federation.repository.optimizers.MpQueryJoinOrderOptimizer;
import com.metaphacts.federation.repository.optimizers.MpQueryMultiJoinOptimizer;
import com.metaphacts.federation.repository.optimizers.MpQueryNaryJoinExtractor;
import com.metaphacts.federation.repository.optimizers.QueryHintsExtractor;
import com.metaphacts.federation.repository.optimizers.QueryHintsSetup;
import com.metaphacts.federation.sparql.FederationSparqlAlgebraUtils;

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
public class MpFederationConnection extends AbstractFederationConnection {

    private static final Logger logger = LogManager.getLogger(MpFederationConnection.class);

    protected class MpFederationTripleSource implements TripleSource {

        private final boolean inf;

        public MpFederationTripleSource(boolean includeInferred) {
            this.inf = includeInferred;
        }

        public CloseableIteration<? extends Statement, QueryEvaluationException> getStatements(
                Resource subj, IRI pred, Value obj, Resource... contexts)
                throws QueryEvaluationException {
            try {
                CloseableIteration<? extends Statement, SailException> result = MpFederationConnection.this
                        .getStatements(subj, pred, obj, inf, contexts);
                return new RemoteClosingExceptionConvertingIteration<Statement>(
                        result);
            } catch (SailException e) {
                throw new QueryEvaluationException(e);
            }
        }

        public ValueFactory getValueFactory() {
            return MpFederationConnection.this.getValueFactory();
        }
    }

    protected MpFederation mpFederation;
    
    final boolean queryHintsEnabled;

    public MpFederationConnection(MpFederation federation,
            List<RepositoryConnection> members) {
        super(federation, members);
        this.mpFederation = federation;
        this.queryHintsEnabled = federation.isEnableQueryHints();
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
                mpFederation.getServiceMappings(), getDefaultMemberConnection());
        if (owner != null && owner.equals(getDefaultMemberConnection())) {
            // Single owner query
            try {
                query = optimizeForSingleOwner(query, dataset, bindings, inf, strategy);
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
    
    /**
     * For single-owner queries we aim not to touch the query tuple expression at all.
     * However, there can still be cases where this is necessary:
     * e.g., if the user added query hints, those query hints will not be understood by the 
     * underlying repository and so have to be deleted
     * (we don't apply them anyway).
     */
    protected TupleExpr optimizeForSingleOwner(TupleExpr parsed, Dataset dataset, BindingSet bindings,
            boolean includeInferred, EvaluationStrategy strategy) throws SailException {
        logger.trace("Incoming query model:\n{}", parsed);
        TupleExpr query = parsed;
        List<StatementPattern> hintPatterns = FederationSparqlAlgebraUtils.extractQueryHintsPatterns(query);
        if (!hintPatterns.isEmpty()) {
            query = new QueryRoot(parsed.clone());
            QueryHintsExtractor queryHintsExtractor = new QueryHintsExtractor();
            queryHintsExtractor.optimize(query, dataset, bindings);
        }
        
        logger.trace("Optimized query model:\n{}", query);
        return query;
    }

    protected TupleExpr optimize(TupleExpr parsed, Dataset dataset, BindingSet bindings,
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

        QueryHintsSetup hintsSetup = new QueryHintsSetup();
        if (queryHintsEnabled) {
            // First, we transform all nested binary joins to n-ary joins
            // Second, we extract all query hints
            // Finally, we reorder the join operands later, at the end of the optimization workflow
            new MpQueryNaryJoinExtractor().optimize(query, dataset, bindings);
            QueryHintsExtractor queryHintsExtractor = new QueryHintsExtractor();
            queryHintsExtractor.optimize(query, dataset, bindings);
            hintsSetup = queryHintsExtractor.getQueryHintsSetup();
        } else {
            // Legacy workflow: we transform all nested binary joins to n-ary joins
            // AND reorder the join operands
            new MpQueryMultiJoinOptimizer().optimize(query, dataset, bindings);
        }
       //     new FilterOptimizer().optimize(query, dataset, bindings);

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

        if (queryHintsEnabled) {
            MpFederationJoinOptimizerWithHints fedJoinOptimizer = new MpFederationJoinOptimizerWithHints(members,
                    getDefaultMemberConnection(), distinct, local, mpFederation.getServiceMappings(),
                    bloomFilterFunction, hintsSetup);
            fedJoinOptimizer.optimize(query, dataset, bindings);
        } else {
            MpFederationJoinOptimizer fedJoinOptimizer = new MpFederationJoinOptimizer(members,
                    getDefaultMemberConnection(), distinct, local, mpFederation.getServiceMappings(),
                    bloomFilterFunction);
            fedJoinOptimizer.optimize(query, dataset, bindings);
        }
        
        
        new MpFederationServiceClauseOptimizer(members, getDefaultMemberConnection(),
                mpFederation.getServiceMappings(), hintsSetup).optimize(query, dataset, bindings);

        new MpOwnedTupleExprPruner().optimize(query, dataset, bindings);
        new QueryModelPruner().optimize(query, dataset, bindings);
        if (queryHintsEnabled) {
            // We reorder the join operands taking into account the query hints
            new MpQueryHintsSyncOptimizer(hintsSetup).optimize(query, dataset, bindings);
            new MpQueryJoinOrderOptimizer(hintsSetup).optimize(query, dataset, bindings);
            new MpPostJoinReorderingLocalJoinOptimizer().optimize(query, dataset, bindings);
        } else {
            // Legacy workflow: we reorder the join operands once again
            // (taking into account the changes in 
            // the query tree made by preceding optimizers)
            new MpQueryMultiJoinOptimizer().optimize(query, dataset, bindings);
        }

        new MpPrepareOwnedTupleExpr().optimize(query, dataset, bindings);

        logger.trace("Optimized query model:\n{}", query);
        return query;
    }
    
    public MpFederation getFederation() {
        return this.mpFederation;
    }
    
    public RepositoryConnection getDefaultMemberConnection() {
        if (members != null && !members.isEmpty()) {
            return members.iterator().next();
        } else {
            throw new IllegalStateException(
                    "Federation connection must contain at least one member as the default one");
        }
    }

    @Override
    protected void startTransactionInternal() throws SailException {
        getDefaultMemberConnection().begin();
    }

    @Override
    protected void commitInternal() throws SailException {
        getDefaultMemberConnection().commit();
    }

    @Override
    protected void rollbackInternal() throws SailException {
        getDefaultMemberConnection().rollback();
    }

    @Override
    protected void addStatementInternal(Resource subj, IRI pred, Value obj, Resource... contexts)
            throws SailException {
        getDefaultMemberConnection().add(subj, pred, obj, contexts);
    }

    @Override
    protected void removeStatementsInternal(Resource subj, IRI pred, Value obj,
            Resource... contexts) throws SailException {
        getDefaultMemberConnection().remove(subj, pred, obj, contexts);
    }

    @Override
    protected void clearInternal(Resource... contexts) throws SailException {
        getDefaultMemberConnection().clear(contexts);
    }

    @Override
    protected void setNamespaceInternal(String prefix, String name) throws SailException {
        getDefaultMemberConnection().setNamespace(prefix, name);
    }

    @Override
    protected void removeNamespaceInternal(String prefix) throws SailException {
        getDefaultMemberConnection().removeNamespace(prefix);
    }

    @Override
    protected void clearNamespacesInternal() throws SailException {
        getDefaultMemberConnection().clearNamespaces();
    }
    
    @Override
    public boolean pendingRemovals() {
        RepositoryConnection defaultConn = getDefaultMemberConnection();
        if (defaultConn instanceof SailRepositoryConnection) {
            return ((SailRepositoryConnection) defaultConn).getSailConnection().pendingRemovals();
        }
        return false;
    }
}