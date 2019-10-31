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

import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.AbstractAggregateOperator;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.ValueExprEvaluationException;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.federation.sparql.algebra.ServiceCallAggregate;

/**
 * Implementation of {@link AggregateEvaluator}. 
 * Processes a custom aggregate function (see {@link AbstractAggregateOperator}).  
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class AggregateServiceEvaluator implements AggregateEvaluator {
    
    protected List<Value> inputValues = Lists.newArrayList();
    protected final Set<Value> distinctValues;

    protected final ValueExpr arg;
    protected final MpFederationStrategy strategy;
    protected final AbstractAggregateOperator operator;

    public AggregateServiceEvaluator(MpFederationStrategy strategy, AbstractAggregateOperator operator) {
        this.strategy = strategy;
        this.arg = operator.getArg();
        this.operator = operator;

        if (operator.isDistinct()) {
            distinctValues = createSet("distinct-values-" + this.hashCode());
        }
        else {
            distinctValues = null;
        }
    }
    
    @Override
    public List<Value> getValues() throws ValueExprEvaluationException {
        if (operator.isDistinct()) {
            inputValues.addAll(distinctValues);
        } 
        return strategy.evaluateAggregateService((ServiceCallAggregate)operator, inputValues);
    }

    @Override
    public void processAggregate(BindingSet bindingSet) throws QueryEvaluationException {
        Value val = evaluate(bindingSet);
        if(operator.isDistinct()) {
            distinctValues.add(val);
        } else {
            inputValues.add(val);
        }
    }
    
    protected boolean distinctValue(Value value) {
        if (distinctValues == null) {
            return true;
        }
        final boolean result = distinctValues.add(value);
        return result;
    }

    protected ValueExpr getArg() {
        return arg;
    }

    protected Value evaluate(BindingSet s)
        throws QueryEvaluationException
    {
        try {
            return strategy.evaluate(getArg(), s);
        }
        catch (ValueExprEvaluationException e) {
            return null; // treat missing or invalid expressions as null
        }
    }
    
    private <T> Set<T> createSet(String setName) {
        return Sets.newLinkedHashSet();
    }

}