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

import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.EvaluationStatistics;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

/**
 * An extension of {@link EvaluationStatistics}, which prioritizes SERVICE
 * clauses and makes them more likely to be executed first among a set of join
 * operands, as opposed to
 * {@link org.eclipse.rdf4j.sail.federation.optimizers.EvaluationStatistics}
 * used by default by the RDF4J federation. This extension also supports
 * multi-join nodes.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpEvaluationStatistics extends EvaluationStatistics {

    protected static class MpCardinalityCalculator extends CardinalityCalculator {

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof NaryJoin) {
                meetMultiJoin((NaryJoin) node);
            } else {
                super.meetOther(node);
            }
        }

        public void meetMultiJoin(NaryJoin node) {
            double cost = 1;
            for (TupleExpr arg : node.getArgs()) {
                arg.visit(this);
                cost *= this.cardinality;
            }
            cardinality = cost;
        }

    }

    public MpEvaluationStatistics() {

    }

    @Override
    protected CardinalityCalculator createCardinalityCalculator() {
        return new MpCardinalityCalculator();
    }

}
