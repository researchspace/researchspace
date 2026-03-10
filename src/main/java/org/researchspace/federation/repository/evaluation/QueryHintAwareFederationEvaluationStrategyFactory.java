/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import org.eclipse.rdf4j.federated.evaluation.FederationEvalStrategy;
import org.eclipse.rdf4j.federated.evaluation.FederationEvaluationStrategyFactory;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.EvaluationStatistics;
import org.eclipse.rdf4j.query.algebra.evaluation.TripleSource;

/**
 * Factory for creating custom federation evaluation strategies that support query hints.
 */
public class QueryHintAwareFederationEvaluationStrategyFactory extends FederationEvaluationStrategyFactory {
    
    @Override
    public FederationEvalStrategy createEvaluationStrategy(Dataset dataset, 
            TripleSource tripleSource, EvaluationStatistics evaluationStatistics) {
        
        // Force use of QueryHintAwareSparqlFederationEvalStrategy for ALL federation types (LOCAL, REMOTE, HYBRID)
        // This ensures that our custom query hint logic (QueryHintAwareJoinOptimizer) is always applied.
        // The standard SailFederationEvalStrategy (used for LOCAL) does NOT support optimizeJoinOrder,
        // which means it bypasses our custom optimizer.
        return new QueryHintAwareSparqlFederationEvalStrategy(getFederationContext());
    }
}
