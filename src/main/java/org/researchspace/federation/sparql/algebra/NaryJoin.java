/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.sparql.algebra;

import java.util.List;

import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;

public class NaryJoin extends AbstractNaryTupleOperator {

    private static final long serialVersionUID = 1L;

    public NaryJoin() {
        super();
    }

    public NaryJoin(List<TupleExpr> args) {
        super(args);
    }

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor) throws X {
        visitor.meetOther(this);
    }

    @Override
    public NaryJoin clone() {
        return (NaryJoin) super.clone();
    }
}
