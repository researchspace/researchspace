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

package com.metaphacts.federation.sparql.rank.optimizers;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.sail.federation.optimizers.EvaluationStatistics;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.federation.sparql.FederationSparqlAlgebraUtils;

/**
 * A helper class to support join order optimization 
 * taking into account input- and output- dependencies 
 * between service calls.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class NaryJoinOrderOptimizerHelper {
    
    EvaluationStatistics statistics;
    List<TupleExpr> joinArgs;
    Set<String> boundVars;

    public NaryJoinOrderOptimizerHelper(List<TupleExpr> joinArgs, Set<String> boundVars) {
        this.statistics = new EvaluationStatistics();
        this.joinArgs = joinArgs;
        this.boundVars = Sets.newHashSet(boundVars);
    }
    
    public List<TupleExpr> orderJoinOperands() {
        
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

        // Reorder the (recursive) join arguments to a more optimal sequence
        List<TupleExpr> orderedJoinArgs = new ArrayList<TupleExpr>(joinArgs.size());

        while (!joinArgs.isEmpty()) {
            TupleExpr tupleExpr = selectNextTupleExprBasedOnInputsOutputs(joinArgs,
                    cardinalityMap, varsMap, varFreqMap, boundVars);

            joinArgs.remove(tupleExpr);
            orderedJoinArgs.add(tupleExpr);

            boundVars.addAll(tupleExpr.getBindingNames());
        }
        
        return orderedJoinArgs;
        
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
            Map<TupleExpr, Double> cardinalityMap, Map<TupleExpr, List<Var>> varsMap,
            Map<Var, Integer> varFreqMap, Set<String> boundVars) {
        Set<String> allOutputVars = Sets.newHashSet();

        for (TupleExpr expr : expressions) {
            // if we have a tuple expression with all inputs bound, put it first
            Set<Var> inputVars = FederationSparqlAlgebraUtils.getInputVars(expr);
            Set<Var> outputVars = FederationSparqlAlgebraUtils.getOutputVars(expr);
            allOutputVars.addAll(outputVars.stream().filter(var -> !var.hasValue())
                    .map(var -> var.getName()).collect(Collectors.toSet()));
            if (inputVars.isEmpty()) {
                continue;
            }
            boolean satisfied = true;
            for (Var inputVar : inputVars) {
                if (!inputVar.hasValue() && !boundVars.contains(inputVar.getName())) {
                    satisfied = false;
                    break;
                }
            }
            if (satisfied) {
                return expr;
            }
        }

        List<TupleExpr> candidateSet = Lists.newArrayList(expressions);

        while (!candidateSet.isEmpty()) {
            TupleExpr nextCandidate = selectNextTupleExpr(candidateSet, cardinalityMap, varsMap,
                    varFreqMap, boundVars);
            Set<Var> inputVars = FederationSparqlAlgebraUtils.getInputVars(nextCandidate);
            Set<Var> outputVars = FederationSparqlAlgebraUtils.getOutputVars(nextCandidate);
            if (inputVars.isEmpty()) {
                Set<String> vars = Sets.newHashSet(nextCandidate.getBindingNames());
                vars.removeAll(boundVars);
                vars.removeAll(outputVars);
                if (!vars.retainAll(allOutputVars)) {
                    return nextCandidate;
                } else {
                 // there are other services which output the variables mentioned in this
                 // tuple expr
                }
                
            }
            candidateSet.remove(nextCandidate);
        }
        // return the first possible one where there is an overlap
        return selectNextTupleExpr(expressions, cardinalityMap, varsMap,
                varFreqMap, boundVars);
    }

    /**
     * Selects from a list of tuple expressions the next tuple expression that should be
     * evaluated. This method selects the tuple expression with highest number of bound
     * variables, preferring variables that have been bound in other tuple expressions over
     * variables with a fixed value.
     */
    protected TupleExpr selectNextTupleExpr(List<TupleExpr> expressions,
            Map<TupleExpr, Double> cardinalityMap, Map<TupleExpr, List<Var>> varsMap,
            Map<Var, Integer> varFreqMap, Set<String> boundVars) {
        double lowestCardinality = Double.MAX_VALUE;
        TupleExpr result = null;

        for (TupleExpr tupleExpr : expressions) {
            // Calculate a score for this tuple expression
            double cardinality = getTupleExprCardinality(tupleExpr, cardinalityMap, varsMap,
                    varFreqMap, boundVars);

            if (cardinality < lowestCardinality) {
                // More specific path expression found
                lowestCardinality = cardinality;
                result = tupleExpr;
            }
        }

        return result;
    }

    protected double getTupleExprCardinality(TupleExpr tupleExpr,
            Map<TupleExpr, Double> cardinalityMap, Map<TupleExpr, List<Var>> varsMap,
            Map<Var, Integer> varFreqMap, Set<String> boundVars) {
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

        Map<Var, Integer> ownFreqMap = getVarFreqMap(ownUnboundVars,
                new HashMap<Var, Integer>());

        for (Map.Entry<Var, Integer> entry : ownFreqMap.entrySet()) {
            Var var = entry.getKey();
            int ownFreq = entry.getValue();
            result += varFreqMap.get(var) - ownFreq;
        }

        return result;
    }

}