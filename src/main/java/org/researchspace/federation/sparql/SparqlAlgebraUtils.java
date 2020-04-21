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

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.researchspace.federation.sparql.optimizers.RemoveNodeQueryModelVisitor;

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
     * Removes all occurrences of the tuple expression {@code toRemove} from under
     * the {@code root}.
     * 
     */
    public static void removeTupleExpr(QueryModelNode root, TupleExpr toRemove) throws Exception {
        RemoveNodeQueryModelVisitor removeVisitor = new RemoveNodeQueryModelVisitor(toRemove);
        root.visit(removeVisitor);
    }

    /**
     * Removes all occurrences of the tuple expression {@code toRemove} in scope
     * {@code scope} from under the {@code root}.
     * 
     */
    public static void removeTupleExpr(QueryModelNode root, TupleExpr toRemove, TupleExpr scope) throws Exception {
        RemoveNodeQueryModelVisitor removeVisitor = new RemoveNodeQueryModelVisitor(toRemove, scope);
        root.visit(removeVisitor);
    }

    /**
     * Finds the tuple expression that serves the root of the scope for a given node
     * {@code leaf}. The scope root is either:
     * <ul>
     * <li>the projection node of the most specific (sub-)query to which the
     * statement pattern belongs</li>
     * <li>the top-most {@link TupleExpr} in the tree to which {@code leaf} belongs
     * (if there are no projection nodes in the tree above {@code leaf})</li>
     * </ul>
     */
    public static TupleExpr getScopeRoot(TupleExpr leaf) {
        if (leaf instanceof Projection) {
            return leaf;
        }
        TupleExpr parent = (TupleExpr) leaf.getParentNode();
        if (parent == null) {
            return leaf;
        } else {
            return getScopeRoot(parent);
        }
    }

    /**
     * Gathers join args from nested joins into a flat list. Moved from
     * {@link QueryMultiJoinOptimizer}
     * 
     * @param tupleExpr
     * @param joinArgs
     * @return
     */
    public static <L extends List<TupleExpr>> L getJoinArgs(TupleExpr tupleExpr, L joinArgs) {
        if (tupleExpr instanceof NaryJoin) {
            NaryJoin join = (NaryJoin) tupleExpr;
            for (TupleExpr arg : join.getArgs()) {
                getJoinArgs(arg, joinArgs);
            }
        } else if (tupleExpr instanceof Join) {
            Join join = (Join) tupleExpr;
            getJoinArgs(join.getLeftArg(), joinArgs);
            getJoinArgs(join.getRightArg(), joinArgs);
        } else {
            joinArgs.add(tupleExpr);
        }

        return joinArgs;
    }

    /**
     * Checks that the statement pattern matches given subject, predicate, and
     * object. Values for subject, predicate, and object can be null (interpreted as
     * wildcard). For the object value, compares both on the typed literal as well
     * as on a string match: i.e., "true"^^xsd:bolean = "true".
     * 
     */
    public static boolean statementPatternMatches(StatementPattern pattern, IRI subject, IRI predicate, Value object) {
        boolean matches = true;
        if (subject != null) {
            matches = matches && varHasValue(pattern.getSubjectVar(), subject, true);
        }
        if (predicate != null) {
            matches = matches && varHasValue(pattern.getPredicateVar(), predicate, true);
        }
        if (object != null) {
            matches = matches && varHasValue(pattern.getObjectVar(), object, false);
        }
        return matches;
    }

    public static boolean varHasValue(Var var, Value val, boolean matchDatatypes) {
        if (matchDatatypes || !(val instanceof Literal)) {
            return var.hasValue() && var.getValue().equals(val);
        } else {
            return var.hasValue() && var.getValue().stringValue().equals(val.stringValue());
        }
    }

}