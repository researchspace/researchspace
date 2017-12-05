/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.sparql;

import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;

import com.metaphacts.sparql.optimizers.RemoveNodeQueryModelVisitor;

/**
 * Util helper class for common operations over SPARQL algebra expressions. 
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class SparqlAlgebraUtils {

    private SparqlAlgebraUtils() {
        
    }
    
    /**
     * Removes all occurrences of the tuple expression {@code toRemove}
     * from under the {@code root}.  
     * 
     */
    public static void removeTupleExpr(QueryModelNode root, TupleExpr toRemove) throws Exception {
        RemoveNodeQueryModelVisitor removeVisitor = new RemoveNodeQueryModelVisitor(toRemove);
        root.visit(removeVisitor);
    }
    
    /**
     * Removes all occurrences of the tuple expression {@code toRemove} 
     * in scope {@code scope} from under the {@code root}.
     * 
     */
    public static void removeTupleExpr(
            QueryModelNode root, 
            TupleExpr toRemove, 
            TupleExpr scope) throws Exception {
        RemoveNodeQueryModelVisitor removeVisitor = 
                new RemoveNodeQueryModelVisitor(toRemove, scope);
        root.visit(removeVisitor);
    }
    
    /**
     * Finds the tuple expression that serves the root of the scope for a given node 
     * {@code leaf}. The scope root is either:
     * <ul>
     *  <li>the projection node of the most specific (sub-)query to which 
     *  the statement pattern belongs</li>
     *  <li>the top-most {@link TupleExpr} in the tree to which {@code leaf} belongs 
     *  (if there are no projection nodes in the tree above {@code leaf})</li>
     * </ul>
     */
    public static TupleExpr getScopeRoot(TupleExpr leaf) {
        if (leaf instanceof Projection) {
            return leaf;
        } 
        TupleExpr parent = (TupleExpr)leaf.getParentNode();
        if (parent == null) {
            return leaf;
        } else {
            return getScopeRoot(parent);
        }
    }

}