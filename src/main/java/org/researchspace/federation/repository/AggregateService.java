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

package org.researchspace.federation.repository;

import java.util.List;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.QueryEvaluationException;

/**
 * 
 * A common interface for custom aggregate services. Takes as input a list of
 * values produced by the GROUP operation and returns the results of the
 * aggregation function. Note: The aggregation function is allowed to return a
 * list of values.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public interface AggregateService {

    /**
     * 
     * Evaluates the aggregation function and returns the results as a list of
     * values.
     * 
     * @param inputValues
     * @return
     * @throws QueryEvaluationException
     */
    public List<Value> evaluateAggregate(List<Value> inputValues) throws QueryEvaluationException;

}