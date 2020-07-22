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

import java.util.Collections;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.util.ValueComparator;
import org.researchspace.federation.repository.AggregateService;

import com.google.common.collect.Lists;

/**
 * Example custom aggregate function finding a median.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MedianAggregateService implements AggregateService {

    public static final IRI SERVICE_ID = SimpleValueFactory.getInstance()
            .createIRI("http://www.researchspace.org/resource/system/service/median");

    public MedianAggregateService() {
        // TODO Auto-generated constructor stub
    }

    @Override
    public List<Value> evaluateAggregate(List<Value> inputValues) throws QueryEvaluationException {

        if (inputValues == null || inputValues.isEmpty()) {
            return Lists.newArrayList((Value) null);
        }

        int idx = inputValues.size() / 2;
        ValueComparator comparator = new ValueComparator();
        Collections.sort(inputValues, comparator);

        return Lists.newArrayList(inputValues.get(idx));
    }

}