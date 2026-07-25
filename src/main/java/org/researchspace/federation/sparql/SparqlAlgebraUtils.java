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

package org.researchspace.federation.sparql;

import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * Utility class for common operations over SPARQL algebra expressions.
 */
public class SparqlAlgebraUtils {

    private SparqlAlgebraUtils() {
    }

    /**
     * Finds the scope root of the (sub)query containing the given node: the
     * nearest enclosing {@link Projection}, or the tree root if there is none.
     *
     * <p>
     * A {@code Projection} is the algebra boundary of a (sub-)SELECT. Two
     * nodes only share a scope root when they belong to the same (sub)query —
     * consumers such as the Virtuoso keyword search extractor rely on this to
     * avoid collecting patterns across sub-SELECT boundaries.
     * </p>
     *
     * @param node the node to find the scope root for
     * @return the nearest enclosing Projection, or the tree root
     */
    public static TupleExpr getScopeRoot(QueryModelNode node) {
        QueryModelNode current = node;
        while (true) {
            if (current instanceof Projection) {
                return (TupleExpr) current;
            }
            QueryModelNode parent = current.getParentNode();
            if (parent == null) {
                return (TupleExpr) current;
            }
            current = parent;
        }
    }

    /**
     * Removes a tuple expression from the query tree. For binary operators (like Join),
     * the parent is replaced with the sibling. For other operators, the child is replaced
     * with an EmptySet.
     * 
     * @param parent the parent node containing the child
     * @param child the tuple expression to remove
     * @param scope unused, kept for API compatibility
     */
    public static void removeTupleExpr(QueryModelNode parent, TupleExpr child, TupleExpr scope) {
        if (parent == null) {
            return;
        }
        
        if (parent instanceof org.eclipse.rdf4j.query.algebra.BinaryTupleOperator) {
            org.eclipse.rdf4j.query.algebra.BinaryTupleOperator binary = 
                (org.eclipse.rdf4j.query.algebra.BinaryTupleOperator) parent;
            TupleExpr other = binary.getLeftArg() == child ? binary.getRightArg() : binary.getLeftArg();
            if (parent.getParentNode() != null) {
                parent.getParentNode().replaceChildNode(parent, other);
            }
        } else {
            parent.replaceChildNode(child, new org.eclipse.rdf4j.query.algebra.EmptySet());
        }
    }
}
