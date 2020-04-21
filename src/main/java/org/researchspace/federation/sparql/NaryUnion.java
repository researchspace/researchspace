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

import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.sail.federation.algebra.AbstractNaryTupleOperator;

/**
 * A UNION expression with multiple arguments.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class NaryUnion extends AbstractNaryTupleOperator {

    private static final long serialVersionUID = -4197799623486507729L;

    public NaryUnion() {
    }

    public NaryUnion(TupleExpr... args) {
        super(args);
    }

    public NaryUnion(List<? extends TupleExpr> args) {
        super(args);
    }

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor) throws X {
        visitor.meetOther(this);
    }

    @Override
    public NaryUnion clone() {
        return (NaryUnion) super.clone();
    }

}