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

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.UnionIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.Group;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.evaluation.EvaluationStrategy;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolver;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.sail.federation.MpFederationConnection;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.eclipse.rdf4j.sail.federation.evaluation.FederationStrategy;
import org.eclipse.rdf4j.sail.federation.evaluation.ParallelJoinCursor;
import org.researchspace.federation.repository.AggregateService;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.sparql.FederationSparqlAlgebraUtils;
import org.researchspace.federation.sparql.MpOwnedTupleExpr;
import org.researchspace.federation.sparql.algebra.ServiceCallAggregate;
import org.researchspace.sparql.renderer.MpSparqlQueryRenderer;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * {@link EvaluationStrategy} implementation for {@link MpFederationConnection}
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpFederationStrategy extends FederationStrategy {

    private static final Logger logger = LogManager.getLogger(MpFederationStrategy.class);
    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    protected final MpFederation federation;
    protected boolean useAsyncParallelJoin = true;
    protected boolean useCompetingJoin = true;
    protected boolean useBoundJoin = true;

    public MpFederationStrategy(MpFederation federation, TripleSource tripleSource, Dataset dataset,
            FederatedServiceResolver serviceManager) {
        super(federation, tripleSource, dataset, serviceManager);
        this.federation = federation;
    }

    /**
     * Evaluates a {@link TupleExpr} by sending it as a separate query to a single
     * target member.
     * 
     * @param expr
     * @param bindings
     * @param owner
     * @return
     * @throws QueryEvaluationException
     */
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluateAtSingleOwner(TupleExpr expr,
            BindingSet bindings, RepositoryConnection owner) throws QueryEvaluationException {
        // Single owner query
        MpOwnedTupleExpr owned = new MpOwnedTupleExpr(owner, expr);
        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        try {
            String renderedQuery = renderer.render(expr);
            Map<String, String> varNames = Maps.newHashMap();
            for (String bindingName : bindings.getBindingNames()) {
                varNames.put(bindingName, bindingName);
            }
            owned.prepare(QueryLanguage.SPARQL, renderedQuery, varNames);
            // Explicit cast because the method evaluate(OwnedTupleExpr, BindingSet)
            // is private in the superclass.
            return evaluate(owned, bindings);
        } catch (Exception e) {
            throw new QueryEvaluationException("Error while executing a single-owner query: " + e.getMessage(), e);
        }
    }

    /**
     * Execute NaryJoin using only nested loop joins.
     * 
     */
    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(NaryJoin join, BindingSet bindings)
            throws QueryEvaluationException {
        assert join.getNumberOfArguments() > 0;
        // Check if there is a case for the competing join (see paper)
        List<TupleExpr> seeds = getPotentialSeeds(join, bindings);
        if ((seeds.size() == 2) && useCompetingJoin) {
            List<TupleExpr> unsortedArgs = Lists.newArrayList(join.getArgs());
            unsortedArgs.removeAll(seeds);
            ParallelTimeEstimatingPullBoundRankJoin prj = new ParallelTimeEstimatingPullBoundRankJoin(this, seeds,
                    unsortedArgs, bindings, Lists.newArrayList(), -1);
            return prj.evaluate(this, seeds, unsortedArgs, bindings);
        } else {

            CloseableIteration<BindingSet, QueryEvaluationException> result = evaluate(join.getArg(0), bindings);
            Set<String> collectedBindingNames = new HashSet<>();
            collectedBindingNames.addAll(join.getArg(0).getBindingNames());
            for (int i = 1, n = join.getNumberOfArguments(); i < n; i++) {

                TupleExpr rightArg = join.getArg(i);
                result = evaluateJoin(result, rightArg, collectedBindingNames);
            }
            return result;
        }
    }

    protected List<TupleExpr> getPotentialSeeds(NaryJoin join, BindingSet bindings) {
        List<TupleExpr> discoveredSeeds = Lists.newArrayList();

        for (TupleExpr expr : join.getArgs()) {
            if (FederationSparqlAlgebraUtils.hasDependencies(expr)
                    && !FederationSparqlAlgebraUtils.hasUnsatisfiedDependencies(expr, bindings)) {
                discoveredSeeds.add(expr);
            }

        }

        return discoveredSeeds;
    }

    public CloseableIteration<BindingSet, QueryEvaluationException> evaluateJoin(
            CloseableIteration<BindingSet, QueryEvaluationException> leftIter, TupleExpr rightArg,
            Set<String> collectedBindingNames) {
        CloseableIteration<BindingSet, QueryEvaluationException> result;
        if ((rightArg instanceof MpOwnedTupleExpr) && useBoundJoin) {
            ParallelBoundJoinCursor tmp = new ParallelBoundJoinCursor(this, leftIter, (MpOwnedTupleExpr) rightArg);
            federation.execute(tmp);
            result = new RemoteClosingExceptionConvertingIteration<BindingSet>(tmp);
            collectedBindingNames.addAll(rightArg.getBindingNames());
        } else if (useAsyncParallelJoin) {
            result = new ParallelAsyncJoinCursorWithCache(this, leftIter, rightArg);
            federation.execute((Runnable) result);
            collectedBindingNames.addAll(rightArg.getBindingNames());
        } else {
            result = new ParallelJoinCursor(this, leftIter, rightArg); // NOPMD
            federation.execute((Runnable) result);
            collectedBindingNames.addAll(rightArg.getBindingNames());
        }
        return result;
    }

    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(TupleExpr expr, BindingSet bindings)
            throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result;
        if (expr instanceof NaryJoin) {
            result = evaluate((NaryJoin) expr, bindings);
        } else if (expr instanceof MpOwnedTupleExpr) {
            result = evaluate((MpOwnedTupleExpr) expr, bindings);
        } else {
            result = super.evaluate(expr, bindings);
        }
        return result;
    }

    protected CloseableIteration<BindingSet, QueryEvaluationException> evaluate(MpOwnedTupleExpr expr,
            BindingSet bindings) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result = expr.evaluate(dataset, bindings);
        if (result == null) {
            TripleSource source = new org.eclipse.rdf4j.repository.evaluation.RepositoryTripleSource(expr.getOwner());
            EvaluationStrategy eval = new MpFederationStrategy(federation, source, dataset, serviceResolver);
            result = eval.evaluate(expr.getArg(), bindings);
        }
        return result;
    }

    @Override
    @SuppressWarnings("unchecked")
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(Union union, BindingSet bindings)
            throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException>[] iters = new CloseableIteration[2];
        iters[0] = evaluate(union.getLeftArg(), bindings);
        iters[1] = evaluate(union.getRightArg(), bindings);
        return new UnionIteration<BindingSet, QueryEvaluationException>(iters);
    }

    protected CloseableIteration<BindingSet, QueryEvaluationException> evaluateUsingBoundRankJoin(MpOwnedTupleExpr expr,
            BindingSet bindings) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result = expr.evaluate(dataset, bindings);
        return result;
    }

    protected CloseableIteration<BindingSet, QueryEvaluationException> evaluateUsingBoundJoin(MpOwnedTupleExpr expr,
            List<BindingSet> bindingSets, Set<String> boundVars) throws QueryEvaluationException {
        CloseableIteration<BindingSet, QueryEvaluationException> result = expr.evaluate(dataset, bindingSets,
                boundVars);
        return result;
    }

    public MpFederation getFederation() {
        return federation;
    }

    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(Group node, BindingSet bindings)
            throws QueryEvaluationException {
        return new MpGroupIterator(this, node, bindings, 0);
    }

    public List<Value> evaluateAggregateService(ServiceCallAggregate aggregate, List<Value> values)
            throws QueryEvaluationException {
        IRI uri = VF.createIRI(aggregate.getURI());
        AggregateService service = federation.getAggregateService(uri);

        if (federation.getAggregateService(uri) != null) {
            return service.evaluateAggregate(values);
        } else {
            throw new QueryEvaluationException("Service not registered: " + aggregate.getURI());
        }
    }

    static int i = 0;

    @Override
    public CloseableIteration<BindingSet, QueryEvaluationException> evaluate(Service service, BindingSet bindings)
            throws QueryEvaluationException {
        logger.trace("Evaluating service: " + service.toString() + " with bindings: " + bindings.toString());
        i++;
        CloseableIteration<BindingSet, QueryEvaluationException> iter = super.evaluate(service, bindings);
        logger.trace("Evaluated service: " + service.toString() + " with bindings: " + bindings.toString());
        logger.trace("Evaluation call: " + i);
        return new RemoteClosingExceptionConvertingIteration<BindingSet>(iter);
    }

    public boolean isUseAsyncParallelJoin() {
        return useAsyncParallelJoin;
    }

    public void setUseAsyncParallelJoin(boolean useAsyncParallelJoin) {
        this.useAsyncParallelJoin = useAsyncParallelJoin;
    }

    public boolean isUseCompetingJoin() {
        return useCompetingJoin;
    }

    public void setUseCompetingJoin(boolean useCompetingJoin) {
        this.useCompetingJoin = useCompetingJoin;
    }

    public boolean isUseBoundJoin() {
        return useBoundJoin;
    }

    public void setUseBoundJoin(boolean useBoundJoin) {
        this.useBoundJoin = useBoundJoin;
    }
}