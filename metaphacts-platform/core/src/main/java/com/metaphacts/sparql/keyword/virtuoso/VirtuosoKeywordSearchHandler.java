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

package com.metaphacts.sparql.keyword.virtuoso;

import java.util.Iterator;
import java.util.List;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.TupleExprs;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.queryrender.RenderUtils;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.sail.SailException;

import com.google.common.collect.Lists;
import com.metaphacts.keyword.KeywordSearchHandler;
import com.metaphacts.sail.virtuoso.VirtuosoKeywordSearchSail;
import com.metaphacts.sparql.keyword.algebra.KeywordSearchGroupTupleExpr;
import com.metaphacts.sparql.keyword.algebra.KeywordSearchPattern;
import com.metaphacts.sparql.renderer.ParsedQueryPreprocessor;
import com.metaphacts.sparql.renderer.PreprocessedQuerySerializer;
import com.metaphacts.sparql.renderer.SerializableParsedConstructQuery;
import com.metaphacts.sparql.renderer.SerializableParsedTupleQuery;

/**
 * Implementation of {@link KeywordSearchHandler} to process full-text search queries over a
 * Virtuoso triple store.
 * 
 * <p>
 * Example search request: query: "cation*" score: yes predicate: rdfs:label
 * </p>
 * 
 * <p>
 * rendered as ?subj rdfs:label ?label . ?label bif:contains "'cation*'" OPTION(score ?sc) .
 * </p>
 * 
 * <p>
 * Example search request with multiple predicates and a short token: query: "ca*" score: yes
 * predicate: rdfs:label, skos:prefLabel
 * </p>
 * 
 * <p>
 * <b>Deprecated</b>
 * rendered using a bif:contains expression without a wildcard: ?subj ?pred ?label .
 * ?label bif:contains "'ca'" OPTION(score ?sc) .
 * FILTER (?pred = rdfs:label || ?pred = skos:prefLabel)
 * </p>
 * 
 * <p>
 * <b>Deprecated</b>
 * Example search request with multiple predicates and a short token: query: "ca*" score: yes
 * predicate: rdfs:label, skos:prefLabel
 * </p>
 * 
 * <p>
 * <b>Deprecated</b>
 * rendered using a LIKE filter (scores are not returned by the backend): ?subj ?pred ?label .
 * FILTER (?pred = rdfs:label || ?pred = skos:prefLabel) FILTER (?label LIKE "ca%")
 * BIND("1.0"^^xsd:double as ?score)
 * </p>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class VirtuosoKeywordSearchHandler implements KeywordSearchHandler {
    
    public static final IRI BIF_CONTAINS = 
            SimpleValueFactory.getInstance().createIRI("bif:contains");
    public static final IRI BIF_SCORE = 
            SimpleValueFactory.getInstance().createIRI("bif:score");

    private static final ValueFactory VF = SimpleValueFactory.getInstance();
    public static final String PREDICATE_VAR_NAME = "pred";

    /**
     * Special implementation of the {@link PreprocessedQuerySerializer} that renders a
     * {@link TupleExpr} that can contain an instance of {@link KeywordSearchGroupTupleExpr}. Such
     * {@link KeywordSearchGroupTupleExpr} will be rendered according to the Virtuoso full-text
     * search syntax.
     *
     */
    protected static class VirtuosoSparqlFullTextSearchSerializerQueryVisitor
            extends PreprocessedQuerySerializer {

        public KeywordSearchPattern keywordSearchPattern = null;
        public long limit = -1;
        public List<OrderElem> orderElements = Lists.newArrayList();

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof KeywordSearchGroupTupleExpr) {
                KeywordSearchPattern pattern = ((KeywordSearchGroupTupleExpr) node)
                        .getKeywordSearchPattern();
                // Stores the pattern, limit, and order elements in the main class
                // The limit and order will then be added to the wrapping query.
                // TODO re-implement using query optimizers once we have static optimization
                // functionality in place
                this.keywordSearchPattern = pattern;
                this.limit = ((KeywordSearchGroupTupleExpr) node).getLimit();
                this.orderElements = ((KeywordSearchGroupTupleExpr) node).getOrderElements();
                // Must always go before the pattern containing the token
                // (required by Virtuoso)
                renderRestrictedPredicates(pattern);

                renderTokenPattern(pattern);

                renderRestrictedTypes(pattern);

            } else {
                super.meetOther(node);
            }
        }

        protected void renderRestrictedPredicates(KeywordSearchPattern pattern) {
            // Renders the restriction by predicate
            // Three possible cases:
            List<Var> predicateVars = Lists.newArrayList(pattern.getPredicateVars());
            Var predVar = new Var(PREDICATE_VAR_NAME);
            if (predicateVars.isEmpty()) {
                // No predicate restriction: simply add a new variable
                predicateVars.add(predVar);
            }
            if (predicateVars.size() == 1) {
                // A single predicate allowed (e.g., rdfs:label).
                // Write as a triple pattern ?subj rdfs:label ?label .
                new StatementPattern(pattern.getSubjectVar(), pattern.getFirstPredicateVar(),
                        pattern.getMatchVar()).visit(this);
            } else {
                // More than one predicate: write a variable in the predicate position,
                // then filter using "FILTER(?prop = <X> || ?prop = <Y>)"
                new StatementPattern(pattern.getSubjectVar(), predVar, pattern.getMatchVar())
                        .visit(this);
                renderPredicatesAsFilter(predVar, pattern.getPredicateVars());
            }
        }

        protected void renderTokenPattern(KeywordSearchPattern pattern) {
            // Now we insist on using bif:contains instead of LIKE
            // to avoid query time delays
            renderKeywordSearchUsingContains(pattern);
        }

        protected void renderPredicatesAsFilter(Var predVarAlias, List<Var> predicateVars) {
            builder.append("FILTER(");
            predVarAlias.visit(this);
            builder.append(" = ");
            Iterator<Var> iterVars = predicateVars.iterator();
            iterVars.next().visit(this);
            while (iterVars.hasNext()) {
                builder.append(" || ");
                predVarAlias.visit(this);
                builder.append(" = ");
                iterVars.next().visit(this);
            }
            builder.append(")\n");
        }

        protected void renderKeywordSearchUsingLike(KeywordSearchPattern pattern) {
            builder.append("\t");
            // LIKE filter pattern is case-sensitive
            builder.append("FILTER( LCASE(");
            pattern.getMatchVar().visit(this);
            builder.append(") LIKE ");
            Var valueVar = pattern.getValueVar();
            String token = valueVar.getValue().stringValue().toLowerCase();
            token = token.replace('*', '%');
            valueVar.setValue(VF.createLiteral(token));
            valueVar.visit(this);
            builder.append(") .\n");
            if (pattern.getScoreVar() != null) {
                builder.append("\t");
                builder.append("BIND(\"1.0\"^^xsd:double AS ");
                pattern.getScoreVar().visit(this);
                builder.append(")");
            }
        }

        protected void renderKeywordSearchUsingContains(KeywordSearchPattern pattern) {
            Var valueVar = pattern.getValueVar();
            String valueVarRender;
            if (valueVar.hasValue()) {
                String keywordString = pattern.getValueVar().getValue().stringValue();
                String[] originalTokens = keywordString.split("\\s|-|,|/");
                List<String> cleanedTokens = Lists.newArrayListWithCapacity(originalTokens.length);
                for (String token : originalTokens) {
                    token = token.trim();
                    String cleaned = token;
                    if (cleaned.startsWith("*")) {
                        cleaned = cleaned.substring(1);
                    }
                    if (cleaned.endsWith("*")) {
                        cleaned = cleaned.substring(0, cleaned.length() - 1);
                    }
                    if (cleaned.length() > 3) {
                        cleaned = token;
                    } else if (cleaned.isEmpty()) {
                        continue;
                    }
                    cleaned = "'" + RenderUtils.escape(cleaned) + "'";
                    cleanedTokens.add(cleaned);
                }
                valueVarRender = "\"" + String.join(" and ", cleanedTokens) + "\"";
            } else {
                valueVarRender = "?" + valueVar.getName();
            }

            builder.append("\t");
            pattern.getMatchVar().visit(this);
            builder.append(" ");
            TupleExprs.createConstVar(BIF_CONTAINS).visit(this);
            builder.append(" ");
            builder.append(valueVarRender);
            

            if (pattern.getScoreVar() != null) {
                builder.append(" OPTION(score ");
                pattern.getScoreVar().visit(this);
                builder.append(")");
            }

            builder.append(" . \n");
        }

        protected void renderRestrictedTypes(KeywordSearchPattern pattern) {
            List<Var> typeVars = pattern.getTypeVars();
            if (typeVars == null || typeVars.isEmpty()) {
                return;
            }

            if (typeVars.size() == 1) {
                new StatementPattern(pattern.getSubjectVar(), TupleExprs.createConstVar(RDF.TYPE),
                        pattern.getFirstTypeVar()).visit(this);
            } else {
                Var typeVar = new Var("type");
                new StatementPattern(pattern.getSubjectVar(), TupleExprs.createConstVar(RDF.TYPE),
                        typeVar).visit(this);
                builder.append("FILTER(");
                typeVar.visit(this);
                builder.append(" = ");
                Iterator<Var> iterVars = typeVars.iterator();
                iterVars.next().visit(this);
                while (iterVars.hasNext()) {
                    builder.append(" || ");
                    typeVar.visit(this);
                    builder.append(" = ");
                    iterVars.next().visit(this);
                }
                builder.append(")\n");
            }
        }

    }

    public VirtuosoKeywordSearchHandler() {

    }

    @Override
    public CloseableIteration<? extends BindingSet, QueryEvaluationException> 
        evaluateKeywordSearchQuery(
            RepositoryConnection conn, TupleExpr tupleExpr, Dataset dataset,
            boolean includeInferred) throws SailException {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        VirtuosoSparqlFullTextSearchSerializerQueryVisitor serializerVisitor = 
                new VirtuosoSparqlFullTextSearchSerializerQueryVisitor();
        String targetQuery = generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);

        try {
            TupleQuery tq = conn.prepareTupleQuery(targetQuery);
            return tq.evaluate();
        } catch (Exception e) {
            throw new SailException(e);
        }
    }
    
    public String generateTargetQuery(ParsedQuery parsedQuery) {
        if (parsedQuery instanceof ParsedTupleQuery) {
            return generateTargetQuery((ParsedTupleQuery)parsedQuery);
        } else if (parsedQuery instanceof ParsedGraphQuery){
            return generateTargetQuery((ParsedGraphQuery)parsedQuery);
        } else {
            throw new IllegalArgumentException(
                    "Unsupported query type: " + parsedQuery.getClass().getName());
        }
    }
    
    public String generateTargetQuery(ParsedTupleQuery parsedQuery) {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        VirtuosoSparqlFullTextSearchSerializerQueryVisitor serializerVisitor = 
                new VirtuosoSparqlFullTextSearchSerializerQueryVisitor();
        SerializableParsedTupleQuery toSerialize = parserVisitor.transformToSerialize(parsedQuery);
        return serializerVisitor.serialize(toSerialize);
    }
    
    public String generateTargetQuery(ParsedGraphQuery parsedQuery) {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        VirtuosoSparqlFullTextSearchSerializerQueryVisitor serializerVisitor = 
                new VirtuosoSparqlFullTextSearchSerializerQueryVisitor();
        SerializableParsedConstructQuery toSerialize = 
                parserVisitor.transformToSerialize(parsedQuery);
        return serializerVisitor.serialize(toSerialize);
    }

    protected String generateTargetQuery(TupleExpr tupleExpr, ParsedQueryPreprocessor preprocessor,
            VirtuosoSparqlFullTextSearchSerializerQueryVisitor serializer) {
        SerializableParsedTupleQuery toSerialize = preprocessor.transformToSerialize(tupleExpr);
        return serializer.serialize(toSerialize);
    }

}