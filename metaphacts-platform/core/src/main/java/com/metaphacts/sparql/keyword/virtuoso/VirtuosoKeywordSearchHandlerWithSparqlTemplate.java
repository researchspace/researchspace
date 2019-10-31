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

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.sail.SailException;

import com.metaphacts.sparql.keyword.algebra.KeywordSearchGroupTupleExpr;
import com.metaphacts.sparql.keyword.algebra.KeywordSearchPattern;
import com.metaphacts.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler.VirtuosoSparqlFullTextSearchSerializerQueryVisitor;
import com.metaphacts.sparql.renderer.ParsedQueryPreprocessor;
import com.metaphacts.sparql.renderer.SerializableParsedTupleQuery;

/**
 * A variation of the {@link VirtuosoKeywordSearchHandler} where 
 * the predicate and type restrictions are provided in SPARQL string template, 
 * and only the token expression is rendered in the class.
 * 
 * <p>Example search request:
 *  query: "cation*"
 *  score: yes
 *  </p>
 *  
 * <p>SPARQL template:
 *  <pre><code>
 *  ?subj &lt;http://nextprot.org/rdf#recommendedName&gt;|&lt;http://nextprot.org/rdf#alternativeName&gt; ?z . 
 *  ?z ?prop ?label . 
 *  FILTER(?prop = &lt;http://nextprot.org/rdf#fullName&gt; || ?prop = &lt;http://nextprot.org/rdf#shortName&gt;) .
 *  </code></pre>
 * rendered as
 *  <pre><code>
 *  ?subj &lt;http://nextprot.org/rdf#recommendedName&gt;|&lt;http://nextprot.org/rdf#alternativeName&gt; ?z . 
 *  ?z ?prop ?label . 
 *  FILTER(?prop = &lt;http://nextprot.org/rdf#fullName&gt; || ?prop = &lt;http://nextprot.org/rdf#shortName&gt;) .
 *  ?label bif:contains "'cation*'" OPTION(score ?sc) .
 *  </code></pre>
 * </p>
 *
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class VirtuosoKeywordSearchHandlerWithSparqlTemplate extends VirtuosoKeywordSearchHandler {
    
    protected static class VirtuosoSparqlFullTextSearchSerializerQueryVisitorWithTemplate 
            extends VirtuosoSparqlFullTextSearchSerializerQueryVisitor {
        
        private final String sparqlTemplate;
        
        public VirtuosoSparqlFullTextSearchSerializerQueryVisitorWithTemplate(String sparqlTemplate) {
            this.sparqlTemplate = sparqlTemplate;
        }

        @Override
        public void meetOther(QueryModelNode node) throws RuntimeException {
            if (node instanceof KeywordSearchGroupTupleExpr) {
                KeywordSearchPattern pattern = ((KeywordSearchGroupTupleExpr) node)
                        .getKeywordSearchPattern();
                builder.append(this.sparqlTemplate);
                renderTokenPattern(pattern);
            } else {
                super.meetOther(node);
            }
        }
    }
    

    protected String sparqlQueryTemplate;
    
    public VirtuosoKeywordSearchHandlerWithSparqlTemplate(
            String sparqlQueryTemplate) {
        super();
        this.sparqlQueryTemplate = sparqlQueryTemplate;
    }
    
    @Override
    public CloseableIteration<? extends BindingSet, QueryEvaluationException> 
        evaluateKeywordSearchQuery(
                RepositoryConnection connection,
                TupleExpr tupleExpr, 
                Dataset dataset, 
                boolean includeInferred)
                        throws SailException {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        VirtuosoSparqlFullTextSearchSerializerQueryVisitorWithTemplate serializerVisitor = 
                new VirtuosoSparqlFullTextSearchSerializerQueryVisitorWithTemplate(
                        this.sparqlQueryTemplate);
        String targetQuery = generateTargetQuery(tupleExpr, parserVisitor, serializerVisitor);
        
        try {
            TupleQuery tq = connection.prepareTupleQuery(targetQuery);
            return tq.evaluate(); 
        } catch (Exception e) {
            throw new SailException(e);
        } 
    }
}