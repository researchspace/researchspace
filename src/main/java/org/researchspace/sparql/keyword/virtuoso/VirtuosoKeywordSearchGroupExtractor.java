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

package org.researchspace.sparql.keyword.virtuoso;

import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.BindingAssigner;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.federation.sparql.SparqlAlgebraUtils;
import org.researchspace.sparql.keyword.algebra.KeywordSearchGroupTupleExpr;
import org.researchspace.sparql.keyword.algebra.KeywordSearchPattern;

/**
 * A query optimizer that tries to find all keyword search clauses in the input
 * query.
 * 
 * <p>
 * The keyword search clause can be expressed as
 * 
 * <pre>
 * <code>
 *  ?instance rdfs:label ?label .
 *  ?label &lt;bif:contains&gt; ?token .
 *  ?label &lt;bif:score&gt; ?score .
 *  </code>
 * 
 * <pre>
 * which would be translated into the Virtuoso-specific format (see
 * {@link VirtuosoKeywordSearchHandler}).
 * </p>
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoKeywordSearchGroupExtractor implements QueryOptimizer {

    protected TupleExpr tupleExpr;
    protected boolean containsKeywordClauses = false;

    public VirtuosoKeywordSearchGroupExtractor() {

    }

    @Override
    public void optimize(TupleExpr original, Dataset dataset, BindingSet bindings) {
        containsKeywordClauses = false;
        TupleExpr cloned = original.clone();
        new BindingAssigner().optimize(cloned, dataset, bindings);

        StatementPatternCollector collector = new StatementPatternCollector();
        cloned.visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();

        List<StatementPattern> mainPatternAsList = stmtPatterns.stream()
                .filter(stmtPattern -> stmtPattern.getPredicateVar().hasValue()
                        && stmtPattern.getPredicateVar().getValue().equals(VirtuosoKeywordSearchHandler.BIF_CONTAINS))
                .collect(Collectors.toList());

        if (mainPatternAsList.isEmpty()) {
            return;
        }

        for (StatementPattern mainPattern : mainPatternAsList) {

            KeywordSearchPattern pattern = new KeywordSearchPattern();

            pattern.setMatchVar(mainPattern.getSubjectVar());
            pattern.setValueVar(mainPattern.getObjectVar());

            TupleExpr scope = SparqlAlgebraUtils.getScopeRoot(mainPattern);

            stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getObjectVar().equals(pattern.getMatchVar())
                    && SparqlAlgebraUtils.getScopeRoot(stmtPattern).equals(scope)).forEach(stmtPattern -> {
                        pattern.setSubjectVar(stmtPattern.getSubjectVar());
                        pattern.addPredicateVar(stmtPattern.getPredicateVar());
                        try {
                            SparqlAlgebraUtils.removeTupleExpr(stmtPattern.getParentNode(), stmtPattern, scope);
                        } catch (Exception e) {
                            throw new SailException(e);
                        }
                    });
            stmtPatterns.stream()
                    .filter(stmtPattern -> stmtPattern.getPredicateVar().hasValue()
                            && stmtPattern.getPredicateVar().getValue().equals(VirtuosoKeywordSearchHandler.BIF_SCORE)
                            && stmtPattern.getSubjectVar().equals(pattern.getMatchVar())
                            && SparqlAlgebraUtils.getScopeRoot(stmtPattern).equals(scope))
                    .forEach(stmtPattern -> {
                        pattern.setScoreVar(stmtPattern.getObjectVar());
                        try {
                            SparqlAlgebraUtils.removeTupleExpr(stmtPattern.getParentNode(), stmtPattern, scope);
                        } catch (Exception e) {
                            throw new SailException(e);
                        }
                    });

            KeywordSearchGroupTupleExpr keywordSearchGroup = new KeywordSearchGroupTupleExpr();
            keywordSearchGroup.setKeywordSearchPattern(pattern);

            mainPattern.getParentNode().replaceChildNode(mainPattern, keywordSearchGroup);
            containsKeywordClauses = true;
        }

        this.tupleExpr = cloned;

    }

    public TupleExpr getTupleExpr() {
        return tupleExpr;
    }

    public boolean containsKeywordClauses() {
        return containsKeywordClauses;
    }

}