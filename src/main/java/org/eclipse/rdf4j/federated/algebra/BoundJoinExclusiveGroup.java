/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.eclipse.rdf4j.federated.algebra;

import java.util.Collection;

import org.eclipse.rdf4j.federated.structures.QueryInfo;

/**
 * Marker subclass of {@link ExclusiveGroup} that implements {@link BoundJoinTupleExpr}.
 * <p>
 * FedX's {@code ExclusiveGroup} does not implement {@code BoundJoinTupleExpr}, so the
 * bind join check in {@code SparqlFederationEvalStrategy.executeLeftJoin()} always fails,
 * causing OPTIONAL clauses to be evaluated via {@code ControlledWorkerLeftJoin} which
 * fires N parallel queries (one per left binding).
 * </p>
 * <p>
 * This subclass adds the marker interface so FedX's existing bind join machinery
 * ({@code ControlledWorkerBindLeftJoin}) is used instead, batching bindings into
 * VALUES-based queries.
 * </p>
 *
 * @see org.researchspace.federation.repository.optimizers.BoundJoinExclusiveGroupOptimizer
 */
public class BoundJoinExclusiveGroup extends ExclusiveGroup implements BoundJoinTupleExpr {

    private static final long serialVersionUID = 1L;

    /**
     * Wrap an existing {@link ExclusiveGroup} in a {@code BoundJoinExclusiveGroup}.
     * <p>
     * Uses same-package access to read the protected fields of the original group
     * ({@code owned}, {@code owner}, {@code queryInfo}).
     * </p>
     */
    public BoundJoinExclusiveGroup(ExclusiveGroup original) {
        super(original.owned, original.owner, original.queryInfo);
        // Copy over filter expressions if present
        if (original.filterExpr != null) {
            this.filterExpr = original.filterExpr;
        }
        if (original.boundFilters != null) {
            this.boundFilters = original.boundFilters;
        }
    }
}
