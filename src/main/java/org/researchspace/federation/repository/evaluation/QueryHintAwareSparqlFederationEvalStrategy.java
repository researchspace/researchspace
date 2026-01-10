/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import org.eclipse.rdf4j.federated.FederationContext;
import org.eclipse.rdf4j.federated.evaluation.SparqlFederationEvalStrategy;
import org.eclipse.rdf4j.federated.optimizer.GenericInfoOptimizer;
import org.eclipse.rdf4j.federated.structures.QueryInfo;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.repository.optimizers.MpQueryHintsSyncOptimizer;
import org.researchspace.federation.repository.optimizers.QueryHintsExtractor;
import org.researchspace.federation.repository.optimizers.QueryHintsSetup;
import org.eclipse.rdf4j.federated.optimizer.DefaultFedXCostModel;

/**
 * Custom evaluation strategy that supports query hints.
 */
public class QueryHintAwareSparqlFederationEvalStrategy extends SparqlFederationEvalStrategy {
    
    public QueryHintAwareSparqlFederationEvalStrategy(FederationContext federationContext) {
        super(federationContext);
    }

    @Override
    protected void optimizeJoinOrder(TupleExpr query, QueryInfo queryInfo, GenericInfoOptimizer info) {
        boolean hintsEnabled = true;
        if (this.federationContext.getFederation() instanceof MpFederation) {
            hintsEnabled = ((MpFederation) this.federationContext.getFederation()).isEnableQueryHints();
        }
        
        if (hintsEnabled) {
            // Extract query hints before join optimization
            QueryHintsExtractor hintsExtractor = new QueryHintsExtractor();
            hintsExtractor.optimize(query, null, null);
            QueryHintsSetup queryHintsSetup = hintsExtractor.getQueryHintsSetup();
            
            // Synchronize hints after previous optimizations may have restructured the query tree
            new MpQueryHintsSyncOptimizer(queryHintsSetup).optimize(query, null, null);
            
            // Use hint-aware join optimizer (handles both reordering and grouping)
            new QueryHintAwareJoinOptimizer(queryInfo, DefaultFedXCostModel.INSTANCE, queryHintsSetup).optimize(query);
        } else {
            super.optimizeJoinOrder(query, queryInfo, info);
        }
    }
}
