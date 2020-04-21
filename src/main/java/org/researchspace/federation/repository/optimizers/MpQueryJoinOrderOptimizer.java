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

package org.researchspace.federation.repository.optimizers;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.bouncycastle.util.StoreException;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.EvaluationStatistics;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.eclipse.rdf4j.sail.federation.optimizers.QueryMultiJoinOptimizer;
import org.researchspace.federation.sparql.FederationSparqlAlgebraUtils;
import org.researchspace.federation.sparql.SparqlAlgebraUtils;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

/**
 * A query optimizer that re-orders nested Joins. Partially copies
 * {@link QueryMultiJoinOptimizer}, but supports query hints.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpQueryJoinOrderOptimizer implements QueryOptimizer {

    protected final EvaluationStatistics statistics;
    protected final QueryHintsSetup queryHints;
    protected final QueryHintsAwareComparator comparator;

    public MpQueryJoinOrderOptimizer(QueryHintsSetup queryHints) {
        this(new MpEvaluationStatistics(), queryHints);
    }

    public MpQueryJoinOrderOptimizer(EvaluationStatistics statistics, QueryHintsSetup queryHints) {
        this.statistics = statistics;
        this.queryHints = queryHints;
        this.comparator = new QueryHintsAwareComparator();
    }

    /**
     * Applies generally applicable optimizations: path expressions are sorted from
     * more to less specific.
     * 
     * @throws StoreException
     */
    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        if (!queryHints.isDisableReordering()) {
            tupleExpr.visit(new JoinVisitor());
        }
    }

    protected class QueryHintsAwareComparator implements Comparator<TupleExpr> {

        @Override
        public int compare(TupleExpr o1, TupleExpr o2) {
            if (queryHints.getExecuteFirst().contains(o1) && !queryHints.getExecuteFirst().contains(o2)) {
                return -1;
            }
            if (!queryHints.getExecuteLast().contains(o1) && queryHints.getExecuteLast().contains(o2)) {
                return -1;
            }
            if (!queryHints.getExecuteFirst().contains(o1) && queryHints.getExecuteFirst().contains(o2)) {
                return 1;
            }
            if (queryHints.getExecuteLast().contains(o1) && !queryHints.getExecuteLast().contains(o2)) {
                return 1;
            }
            return 0;
        }

    }

    protected class JoinVisitor extends AbstractQueryModelVisitor<RuntimeException> {

        private Set<String> boundVars = new HashSet<String>();

        @Override
        public void meet(LeftJoin leftJoin) {
            leftJoin.getLeftArg().visit(this);

            Set<String> origBoundVars = boundVars;
            try {
                boundVars = new HashSet<String>(boundVars);
                boundVars.addAll(leftJoin.getLeftArg().getBindingNames());

                leftJoin.getRightArg().visit(this);
            } finally {
                boundVars = origBoundVars;
            }
        }

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof NaryJoin) {
                meetJoin((NaryJoin) node);
            } else {
                super.meetOther(node);
            }
        }

        @Override
        public void meet(Join node) throws RuntimeException {
            meetJoin(node);
        }

        // We don't make any join optimizations inside the SERVICE clauses
        @Override
        public void meet(Service node) throws RuntimeException {
            return;
        }

        public void meetJoin(TupleExpr node) {
            Set<String> origBoundVars = boundVars;
            try {
                boundVars = new HashSet<String>(boundVars);

                // Recursively get the join arguments
                List<TupleExpr> joinArgs = SparqlAlgebraUtils.getJoinArgs(node, new ArrayList<TupleExpr>());

                // Reorder joinArgs based on query hints without touching unaffected expressions
                List<TupleExpr> executeFirst = MpQueryJoinOrderOptimizer.this.queryHints.getExecuteFirst();
                List<TupleExpr> executeLast = MpQueryJoinOrderOptimizer.this.queryHints.getExecuteLast();
                for (int i = 1; i < joinArgs.size(); i++) {
                    TupleExpr currentArg = joinArgs.get(i);
                    if (executeFirst.contains(currentArg)) {
                        TupleExpr swap = joinArgs.get(0);
                        joinArgs.set(0, currentArg);
                        joinArgs.set(i, swap);
                    }
                }
                for (int i = joinArgs.size() - 2; i >= 0; i--) {
                    TupleExpr currentArg = joinArgs.get(i);
                    if (executeLast.contains(currentArg)) {
                        TupleExpr swap = joinArgs.get(joinArgs.size() - 1);
                        joinArgs.set(joinArgs.size() - 1, currentArg);
                        joinArgs.set(i, swap);
                    }
                }

                // Build maps of cardinalities and vars per tuple expression
                Map<TupleExpr, Double> cardinalityMap = new HashMap<TupleExpr, Double>();
                Map<TupleExpr, List<Var>> varsMap = new HashMap<TupleExpr, List<Var>>();

                for (TupleExpr tupleExpr : joinArgs) {
                    cardinalityMap.put(tupleExpr, statistics.getCardinality(tupleExpr));
                    varsMap.put(tupleExpr, getStatementPatternVars(tupleExpr));
                }

                // Build map of var frequences
                Map<Var, Integer> varFreqMap = new HashMap<Var, Integer>();
                for (List<Var> varList : varsMap.values()) {
                    getVarFreqMap(varList, varFreqMap);
                }

                if (!MpQueryJoinOrderOptimizer.this.queryHints.isDisableReordering()) {
                    // Reorder the (recursive) join arguments to a more optimal sequence
                    List<TupleExpr> orderedJoinArgs = new ArrayList<TupleExpr>(joinArgs.size());

                    while (!joinArgs.isEmpty()) {
                        TupleExpr tupleExpr = selectNextTupleExprBasedOnInputsOutputs(joinArgs, cardinalityMap, varsMap,
                                varFreqMap, boundVars);

                        joinArgs.remove(tupleExpr);
                        orderedJoinArgs.add(tupleExpr);

                        // Recursively optimize join arguments
                        tupleExpr.visit(this);

                        boundVars.addAll(tupleExpr.getBindingNames());
                    }

                    // Build new join hierarchy
                    TupleExpr replacement = new NaryJoin(orderedJoinArgs);

                    // Replace old join hierarchy
                    node.replaceWith(replacement);
                }
            } finally {
                boundVars = origBoundVars;
            }
        }

        protected List<Var> getStatementPatternVars(TupleExpr tupleExpr) {
            List<StatementPattern> stPatterns = StatementPatternCollector.process(tupleExpr);
            List<Var> varList = new ArrayList<Var>(stPatterns.size() * 4);
            for (StatementPattern sp : stPatterns) {
                sp.getVars(varList);
            }
            return varList;
        }

        protected <M extends Map<Var, Integer>> M getVarFreqMap(List<Var> varList, M varFreqMap) {
            for (Var var : varList) {
                Integer freq = varFreqMap.get(var);
                freq = (freq == null) ? 1 : freq + 1;
                varFreqMap.put(var, freq);
            }
            return varFreqMap;
        }

        protected TupleExpr selectNextTupleExprBasedOnInputsOutputs(List<TupleExpr> expressions,
                Map<TupleExpr, Double> cardinalityMap, Map<TupleExpr, List<Var>> varsMap, Map<Var, Integer> varFreqMap,
                Set<String> boundVars) {
            Set<String> allOutputVars = Sets.newHashSet();

            List<TupleExpr> candidatesWithUnboundInputs = Lists.newArrayList();

            // Here we only choose between arguments that do not have unbound inputs.
            // Among those, the applies:
            // 1. Those which are marked by <executeFirst> query hints
            // 2. Those which have explicit inputs, all those are bound, and are not marked
            // by <executeLast>
            for (TupleExpr expr : expressions) {
                // if we have a tuple expression with all inputs bound, put it first
                Set<Var> inputVars = FederationSparqlAlgebraUtils.getInputVars(expr);
                Set<Var> outputVars = FederationSparqlAlgebraUtils.getOutputVars(expr);
                allOutputVars.addAll(outputVars.stream().filter(var -> !var.hasValue()).map(var -> var.getName())
                        .collect(Collectors.toSet()));
                if (inputVars.isEmpty()) {
                    if (queryHints.getExecuteFirst().contains(expr)) {
                        return expr;
                    }
                    continue;
                }
                boolean satisfied = true;
                for (Var inputVar : inputVars) {
                    if (!inputVar.hasValue() && !boundVars.contains(inputVar.getName())) {
                        satisfied = false;
                        candidatesWithUnboundInputs.add(expr);
                        break;
                    }
                }
                if (satisfied && !queryHints.getExecuteLast().contains(expr)) {
                    return expr;
                }
            }

            List<TupleExpr> candidateSet = Lists.newArrayList(expressions);

            List<TupleExpr> candidateSetWithoutOutputDependencies = Lists.newArrayList(candidateSet);
            candidateSetWithoutOutputDependencies.removeAll(candidatesWithUnboundInputs);
            while (!candidateSet.isEmpty()) {
                TupleExpr nextCandidate = selectNextTupleExpr(candidateSet, cardinalityMap, varsMap, varFreqMap,
                        boundVars);
                if (queryHints.getExecuteFirst().contains(nextCandidate)) {
                    return nextCandidate;
                } else if (queryHints.getExecuteLast().contains(nextCandidate)) {
                    candidateSetWithoutOutputDependencies.remove(nextCandidate);
                    candidateSet.remove(nextCandidate);
                    continue;
                }

                Set<Var> inputVars = FederationSparqlAlgebraUtils.getInputVars(nextCandidate);
                Set<Var> outputVars = FederationSparqlAlgebraUtils.getOutputVars(nextCandidate);
                Set<String> currentOutputVars = outputVars.stream().filter(var -> !var.hasValue())
                        .map(var -> var.getName()).collect(Collectors.toSet());
                if (inputVars.isEmpty()) {
                    Set<String> vars = Sets.newHashSet(nextCandidate.getBindingNames());
                    vars.removeAll(boundVars);
                    vars.removeAll(currentOutputVars);
                    vars.retainAll(allOutputVars);
                    if (!vars.isEmpty()) {
                        // there are other services which output the variables mentioned in this
                        // tuple expr
                        candidateSet.remove(nextCandidate);
                        candidateSetWithoutOutputDependencies.remove(nextCandidate);
                        continue;
                    }
                    vars = Sets.newHashSet(nextCandidate.getBindingNames());
                    vars.retainAll(boundVars);
                    // return the first possible one where there is an overlap
                    if (!vars.isEmpty()) {
                        return nextCandidate;
                    }
                }
                candidateSet.remove(nextCandidate);
            }

            // return any possible one without output dependencies
            if (!candidateSetWithoutOutputDependencies.isEmpty()) {
                return selectNextTupleExpr(candidateSetWithoutOutputDependencies, cardinalityMap, varsMap, varFreqMap,
                        boundVars);
            }

            candidateSet = Lists.newArrayList(expressions);
            candidateSet.removeAll(candidatesWithUnboundInputs);
            candidateSet.removeAll(queryHints.getExecuteLast());
            if (!candidateSet.isEmpty()) {
                // return any one which neither has unbound inputs nor explicitly forbidden
                return selectNextTupleExpr(candidateSet, cardinalityMap, varsMap, varFreqMap, boundVars);
            }

            // return any possible one based on cardinality
            return selectNextTupleExpr(expressions, cardinalityMap, varsMap, varFreqMap, boundVars);
        }

        /**
         * Selects from a list of tuple expressions the next tuple expression that
         * should be evaluated. This method selects the tuple expression with highest
         * number of bound variables, preferring variables that have been bound in other
         * tuple expressions over variables with a fixed value.
         */
        protected TupleExpr selectNextTupleExpr(List<TupleExpr> expressions, Map<TupleExpr, Double> cardinalityMap,
                Map<TupleExpr, List<Var>> varsMap, Map<Var, Integer> varFreqMap, Set<String> boundVars) {
            double lowestCardinality = Double.MAX_VALUE;
            TupleExpr result = null;

            for (TupleExpr tupleExpr : expressions) {
                // Calculate a score for this tuple expression
                double cardinality = getTupleExprCardinality(tupleExpr, cardinalityMap, varsMap, varFreqMap, boundVars);
                if (result == null) {
                    lowestCardinality = cardinality;
                    result = tupleExpr;
                }

                int compare = comparator.compare(tupleExpr, result);

                if (compare < 0) {
                    lowestCardinality = cardinality;
                    result = tupleExpr;
                } else if ((compare == 0) && (cardinality < lowestCardinality)) {
                    lowestCardinality = cardinality;
                    result = tupleExpr;
                }
            }

            return result;
        }

        protected double getTupleExprCardinality(TupleExpr tupleExpr, Map<TupleExpr, Double> cardinalityMap,
                Map<TupleExpr, List<Var>> varsMap, Map<Var, Integer> varFreqMap, Set<String> boundVars) {
            double cardinality = cardinalityMap.get(tupleExpr);

            List<Var> vars = varsMap.get(tupleExpr);

            // Compensate for variables that are bound earlier in the evaluation
            List<Var> unboundVars = getUnboundVars(vars);
            List<Var> constantVars = getConstantVars(vars);
            int nonConstantCount = vars.size() - constantVars.size();
            if (nonConstantCount > 0) {
                double exp = (double) unboundVars.size() / nonConstantCount;
                cardinality = Math.pow(cardinality, exp);
            }

            if (unboundVars.isEmpty()) {
                // Prefer patterns with more bound vars
                if (nonConstantCount > 0) {
                    cardinality /= nonConstantCount;
                }
            } else {
                // Prefer patterns that bind variables from other tuple expressions
                int foreignVarFreq = getForeignVarFreq(unboundVars, varFreqMap);
                if (foreignVarFreq > 0) {
                    cardinality /= foreignVarFreq;
                }
            }

            // Prefer patterns that bind more variables
            // List<Var> distinctUnboundVars = getUnboundVars(new
            // HashSet<Var>(vars));
            // if (distinctUnboundVars.size() >= 2) {
            // cardinality /= distinctUnboundVars.size();
            // }

            return cardinality;
        }

        protected List<Var> getConstantVars(Iterable<Var> vars) {
            List<Var> constantVars = new ArrayList<Var>();

            for (Var var : vars) {
                if (var.hasValue()) {
                    constantVars.add(var);
                }
            }

            return constantVars;
        }

        protected List<Var> getUnboundVars(Iterable<Var> vars) {
            List<Var> unboundVars = new ArrayList<Var>();

            for (Var var : vars) {
                if (!var.hasValue() && !this.boundVars.contains(var.getName())) {
                    unboundVars.add(var);
                }
            }

            return unboundVars;
        }

        protected int getForeignVarFreq(List<Var> ownUnboundVars, Map<Var, Integer> varFreqMap) {
            int result = 0;

            Map<Var, Integer> ownFreqMap = getVarFreqMap(ownUnboundVars, new HashMap<Var, Integer>());

            for (Map.Entry<Var, Integer> entry : ownFreqMap.entrySet()) {
                Var var = entry.getKey();
                int ownFreq = entry.getValue();
                result += varFreqMap.get(var) - ownFreq;
            }

            return result;
        }
    }
}