/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository.evaluation;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.util.ValueComparator;
import org.eclipse.rdf4j.query.parser.sparql.aggregate.AggregateCollector;
import org.eclipse.rdf4j.query.parser.sparql.aggregate.AggregateFunction;
import org.eclipse.rdf4j.query.parser.sparql.aggregate.AggregateFunctionFactory;

/**
 * Median as an rdf4j custom aggregate function:
 *
 * <pre>SELECT (&lt;http://www.researchspace.org/resource/system/service/median&gt;(?price) AS ?m) ...</pre>
 *
 * <p>
 * The pre-rdf4j-5 ephedra engine shipped a median "aggregate service" under
 * the same IRI (see the deleted {@code MedianAggregateService}); this factory
 * keeps existing queries working after the FedX rewrite. Values are ordered
 * with rdf4j's {@link ValueComparator} and the upper median is returned,
 * matching the old implementation.
 * </p>
 *
 * <p>
 * Registered via {@code META-INF/services} with rdf4j's
 * {@code CustomAggregateFunctionRegistry}, so it works in every repository
 * type, not just the federation.
 * </p>
 */
public class MedianAggregateFactory implements AggregateFunctionFactory {

    public static final String MEDIAN_IRI = "http://www.researchspace.org/resource/system/service/median";

    @Override
    public String getIri() {
        return MEDIAN_IRI;
    }

    @Override
    public AggregateFunction<?, ?> buildFunction(Function<BindingSet, Value> evaluationStep) {
        return new MedianAggregateFunction(evaluationStep);
    }

    @Override
    public AggregateCollector getCollector() {
        return new MedianCollector();
    }

    /** Accumulates values; the final value is the upper median. */
    public static class MedianCollector implements AggregateCollector {

        private final List<Value> values = new ArrayList<>();

        void addValue(Value value) {
            values.add(value);
        }

        @Override
        public Value getFinalValue() {
            if (values.isEmpty()) {
                return null;
            }
            values.sort(new ValueComparator());
            return values.get(values.size() / 2);
        }
    }

    /** Per-solution processor feeding the {@link MedianCollector}. */
    public static class MedianAggregateFunction extends AggregateFunction<MedianCollector, Value> {

        public MedianAggregateFunction(Function<BindingSet, Value> evaluationStep) {
            super(evaluationStep);
        }

        @Override
        public void processAggregate(BindingSet bindingSet, Predicate<Value> distinctValue, MedianCollector collector)
                throws QueryEvaluationException {
            Value value = evaluate(bindingSet);
            if (value != null && distinctValue.test(value)) {
                collector.addValue(value);
            }
        }
    }
}
