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

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.bouncycastle.util.StoreException;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Filter;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.UnaryTupleOperator;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;

import com.google.common.collect.Lists;

/**
 * After applying other optimizers, the original operands of executeFirst /
 * executeLast directives can be moved in the query tree such that they
 * themselves no longer appear as join arguments. In this class, we replace them
 * in the query hints setup with the actual join arguments, if these arguments
 * represent unary tuple operators.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpQueryHintsSyncOptimizer implements QueryOptimizer {

    protected static class QueryHintSynchronizer extends AbstractQueryModelVisitor<Exception> {

        protected final TupleExpr original;
        protected final List<TupleExpr> derived = Lists.newArrayList();

        protected QueryHintSynchronizer(TupleExpr original) {
            this.original = original;
        }

        @Override
        public void meet(Filter node) throws Exception {
            // Skip boolean constraints
            node.getArg().visit(this);
        }

        @Override
        protected void meetNode(QueryModelNode node) throws Exception {
            if (node.equals(original)) {
                // We found our statement, now we add all its parents that are unary operators
                processParents((TupleExpr) node);
            } else {
                super.meetNode(node);
            }
        }

        protected void processParents(TupleExpr node) {
            QueryModelNode parent = node.getParentNode();
            if (parent instanceof UnaryTupleOperator) {
                derived.add((UnaryTupleOperator) parent);
                processParents((UnaryTupleOperator) parent);
            }
        }

        public List<TupleExpr> getDerived() {
            return derived;
        }
    }

    private static final Logger logger = LogManager.getLogger(MpQueryHintsSyncOptimizer.class);

    protected final QueryHintsSetup queryHints;

    public MpQueryHintsSyncOptimizer(QueryHintsSetup queryHints) {
        this.queryHints = queryHints;
    }

    /**
     * Enriches the list of query hints with "derived" tuple exprs: those which
     * represent unary operators over the original ones.
     * 
     * @throws StoreException
     */
    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        processQueryHintsTargetList(tupleExpr, this.queryHints.getExecuteFirst());
        processQueryHintsTargetList(tupleExpr, this.queryHints.getExecuteLast());
    }

    protected void processQueryHintsTargetList(TupleExpr tupleExpr, List<TupleExpr> hintTargets) {
        List<TupleExpr> derived = Lists.newArrayList();
        for (TupleExpr hintTarget : hintTargets) {
            try {
                QueryHintSynchronizer visitor = new QueryHintSynchronizer(hintTarget);
                tupleExpr.visit(visitor);
                derived.addAll(visitor.getDerived());
            } catch (Exception e) {
                // Something unexpected happened, we cannot properly process query hints
                // but probably we should not break the whole query because of this
                logger.error("Error during query hints-related optimization: " + e.getMessage());
                logger.debug(e);
            }
        }
        hintTargets.addAll(derived);
    }
}