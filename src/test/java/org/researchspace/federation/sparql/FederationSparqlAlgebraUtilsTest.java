/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.sparql;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.BooleanLiteral;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.junit.Test;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * Hint-pattern matching must accept the legacy literal forms accepted by the
 * pre-rdf4j-5 engine: {@code ephedra:executeFirst "true"} (a plain xsd:string
 * literal) worked before the upgrade. Since the extractor strips every
 * hint-predicate pattern regardless, a strict object comparison silently
 * removes-but-ignores such hints.
 */
public class FederationSparqlAlgebraUtilsTest {

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    private StatementPattern hintPattern(Value object) {
        return new StatementPattern(
                new Var("s", MpRepositoryVocabulary.PRIOR),
                new Var("p", MpRepositoryVocabulary.EXECUTE_FIRST),
                new Var("o", object));
    }

    @Test
    public void booleanTypedLiteralMatches() {
        assertTrue(FederationSparqlAlgebraUtils.statementPatternMatches(hintPattern(BooleanLiteral.TRUE),
                MpRepositoryVocabulary.PRIOR, MpRepositoryVocabulary.EXECUTE_FIRST, BooleanLiteral.TRUE));
    }

    @Test
    public void legacyPlainStringLiteralMatches() {
        assertTrue("legacy string-literal hint objects (\"true\" instead of true) must still match",
                FederationSparqlAlgebraUtils.statementPatternMatches(hintPattern(vf.createLiteral("true")),
                        MpRepositoryVocabulary.PRIOR, MpRepositoryVocabulary.EXECUTE_FIRST, BooleanLiteral.TRUE));
    }

    @Test
    public void differentLiteralValueDoesNotMatch() {
        assertFalse(FederationSparqlAlgebraUtils.statementPatternMatches(hintPattern(vf.createLiteral("false")),
                MpRepositoryVocabulary.PRIOR, MpRepositoryVocabulary.EXECUTE_FIRST, BooleanLiteral.TRUE));
    }

    @Test
    public void iriObjectDoesNotMatchLiteral() {
        assertFalse(FederationSparqlAlgebraUtils.statementPatternMatches(
                hintPattern(vf.createIRI("http://example.org/true")),
                MpRepositoryVocabulary.PRIOR, MpRepositoryVocabulary.EXECUTE_FIRST, BooleanLiteral.TRUE));
    }
}
