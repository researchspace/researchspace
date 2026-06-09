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

import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

/**
 * Utility class for common operations over SPARQL algebra expressions.
 */
public class SparqlAlgebraUtils {

    private SparqlAlgebraUtils() {
    }

    /**
     * Finds the root TupleExpr of the query tree containing the given node.
     * 
     * @param node the node to find the scope root for
     * @return the root TupleExpr of the query tree
     */
    public static TupleExpr getScopeRoot(QueryModelNode node) {
        QueryModelNode parent = node.getParentNode();
        if (parent == null) {
            return (TupleExpr) node;
        }
        while (parent.getParentNode() != null) {
            parent = parent.getParentNode();
        }
        return (TupleExpr) parent;
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
