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

import java.util.Comparator;
import java.util.List;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.ValueExprEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.util.ValueComparator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MpOrderComparator implements Comparator<BindingSet> {

    private final Logger logger = LoggerFactory.getLogger(MpOrderComparator.class);

    private final MpFederationStrategy strategy;

    private final List<OrderElem> orderElements;

    private final ValueComparator cmp;

    public MpOrderComparator(MpFederationStrategy strategy, List<OrderElem> orderElements, ValueComparator comparator) {
        this.strategy = strategy;
        this.orderElements = orderElements;
        this.cmp = comparator;
    }

    @Override
    public int compare(BindingSet o1, BindingSet o2) {
        try {
            for (OrderElem element : orderElements) {
                Value v1 = evaluate(element.getExpr(), o1);
                Value v2 = evaluate(element.getExpr(), o2);

                int compare = cmp.compare(v1, v2);

                if (compare != 0) {
                    return element.isAscending() ? compare : -compare;
                }
            }

            return 0;
        } catch (QueryEvaluationException e) {
            logger.debug(e.getMessage(), e);
            return 0;
        } catch (IllegalArgumentException e) {
            logger.debug(e.getMessage(), e);
            return 0;
        }
    }

    public Value evaluate(ValueExpr valueExpr, BindingSet o) throws QueryEvaluationException {
        try {
            return strategy.evaluate(valueExpr, o);
        } catch (ValueExprEvaluationException exc) {
            return null;
        }
    }

}