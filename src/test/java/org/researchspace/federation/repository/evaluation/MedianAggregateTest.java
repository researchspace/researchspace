/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository.evaluation;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.junit.Test;

/**
 * The pre-rdf4j-5 engine supported custom aggregate functions over the
 * federation, shipping a median implementation under
 * {@code http://www.researchspace.org/resource/system/service/median}. After
 * the FedX rewrite the same IRI must stay usable — now as an rdf4j custom
 * aggregate function (registered via {@code CustomAggregateFunctionRegistry}),
 * which works in ANY repository, not just the federation.
 */
public class MedianAggregateTest {

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    @Test
    public void medianAggregateEvaluates() {
        SailRepository repo = new SailRepository(new MemoryStore());
        repo.init();
        try (var conn = repo.getConnection()) {
            var s = vf.createIRI("http://example.org/s");
            var p = vf.createIRI("http://example.org/p");
            conn.add(s, p, vf.createLiteral(5));
            conn.add(s, p, vf.createLiteral(1));
            conn.add(s, p, vf.createLiteral(3));

            String query = "SELECT (<http://www.researchspace.org/resource/system/service/median>(?v) AS ?m) "
                    + "WHERE { ?s <http://example.org/p> ?v }";
            try (TupleQueryResult result = conn.prepareTupleQuery(query).evaluate()) {
                assertTrue(result.hasNext());
                assertEquals("3", result.next().getValue("m").stringValue());
            }
        } finally {
            repo.shutDown();
        }
    }
}
