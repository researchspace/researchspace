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
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.collectors.StatementPatternCollector;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * SPARQL algebra utils serving {@link MpFederation}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class FederationSparqlAlgebraUtils {

    private FederationSparqlAlgebraUtils() {

    }

    public static boolean isQueryHint(TupleExpr expr) {
        if (expr instanceof StatementPattern) {
            Var predicateVar = ((StatementPattern) expr).getPredicateVar();
            if (predicateVar.hasValue()) {
                Value val = predicateVar.getValue();
                return MpRepositoryVocabulary.queryHints.contains(val);
            }
        }
        return false;
    }

    public static List<StatementPattern> extractQueryHintsPatterns(TupleExpr expr) {
        List<StatementPattern> allPatterns = new java.util.ArrayList<>();
        expr.visit(new org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor<RuntimeException>() {
            @Override
            public void meet(StatementPattern node) {
                if (isQueryHint(node)) {
                    allPatterns.add(node);
                }
            }
            
            @Override
            public void meetOther(org.eclipse.rdf4j.query.algebra.QueryModelNode node) {
                if (node instanceof StatementPattern) {
                    meet((StatementPattern) node);
                } else {
                    super.meetOther(node);
                }
            }
        });
        return allPatterns;
    }

    public static boolean statementPatternMatches(StatementPattern sp, IRI subj, IRI pred, Value obj) {
        if (subj != null) {
            if (!sp.getSubjectVar().hasValue() || !sp.getSubjectVar().getValue().equals(subj)) return false;
        }
        if (pred != null) {
            if (!sp.getPredicateVar().hasValue() || !sp.getPredicateVar().getValue().equals(pred)) return false;
        }
        if (obj != null) {
            if (!sp.getObjectVar().hasValue() || !sp.getObjectVar().getValue().equals(obj)) return false;
        }
        return true;
    }

}