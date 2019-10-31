/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.federation.repository.optimizers;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.filters.RepositoryBloomFilter;
import org.eclipse.rdf4j.sail.federation.PrefixHashSet;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

/**
 * Repeats the procedure from the superclass, 
 * but does not merge too consequent statement patterns
 * that are to be sent to the same source 
 * into a local join, if one of them is affected by a query hint 
 * (executeFirst or executeLast).
 * 
 */
public class MpFederationJoinOptimizerWithHints extends MpFederationJoinOptimizer {
    
    protected final QueryHintsSetup queryHints;

    public MpFederationJoinOptimizerWithHints(Collection<? extends RepositoryConnection> members,
            RepositoryConnection mainMember, boolean distinct, PrefixHashSet localSpace,
            Map<IRI, ? extends Repository> serviceMappings, QueryHintsSetup queryHints) {
        super(members, mainMember, distinct, localSpace, serviceMappings);
        this.queryHints = queryHints;
    }

    public MpFederationJoinOptimizerWithHints(Collection<? extends RepositoryConnection> members,
            RepositoryConnection mainMember, boolean distinct, PrefixHashSet localSpace,
            Map<IRI, ? extends Repository> serviceMappings,
            Function<? super Repository, ? extends RepositoryBloomFilter> bloomFilters, QueryHintsSetup queryHints) {
        super(members, mainMember, distinct, localSpace, serviceMappings, bloomFilters);
        this.queryHints = queryHints;
    }

    private boolean isAffectedByQueryHint(TupleExpr arg) {
        return (this.queryHints.getExecuteFirst().contains(arg) || this.queryHints.getExecuteLast().contains(arg));
    }

    @Override
    protected boolean shouldMergeForLocalJoin(TupleExpr arg, List<Owned<NaryJoin>> ows, RepositoryConnection owner) {
        if (!ows.isEmpty()) {
            Owned<NaryJoin> prevOwn = ows.get(ows.size() - 1);
            List<? extends TupleExpr> args = prevOwn.getOperation().getArgs(); 
            // We do not merge the current join operand with the previous one, 
            // if the previous one was affected by a query hint
            if (args.size() > 0 && isAffectedByQueryHint(args.get(0))) {
                return false;
            }
            // We also merge the current operand only if it is not affected by a query hint
            return ((prevOwn.getOwner() == owner) && (!isAffectedByQueryHint(arg)));
        }
        return false;
    }
}
