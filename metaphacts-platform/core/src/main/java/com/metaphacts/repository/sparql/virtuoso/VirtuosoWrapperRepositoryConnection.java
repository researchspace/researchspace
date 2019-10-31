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

package com.metaphacts.repository.sparql.virtuoso;

import static org.eclipse.rdf4j.query.QueryLanguage.SPARQL;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Query;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.query.impl.SimpleDataset;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.base.RepositoryConnectionWrapper;
import org.eclipse.rdf4j.repository.sparql.SPARQLConnection;

import com.metaphacts.api.sparql.SparqlUtil;
import com.metaphacts.sparql.keyword.virtuoso.VirtuosoKeywordSearchGroupExtractor;
import com.metaphacts.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler;

/**
 * A wrapper connection for a Virtuoso SPARQL repository.
 * <ul>
 *  <li>Supports ASK queries (not allowed in Virtuoso) by transforming them 
 *      into equivalent SELECT ones.</li>
 *  <li>Re-writes keyword search clauses according to the Virtuoso syntax 
 *      (see {@link VirtuosoKeywordSearchHandler}).</li>
 * </ul> 
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperRepositoryConnection extends RepositoryConnectionWrapper {
    
    private static final String SOMETHING = "ASK { ?s ?p ?o }";
    
    private static final Logger logger = 
            LogManager.getLogger(VirtuosoWrapperRepositoryConnection.class);

    protected static VirtuosoKeywordSearchHandler keywordSearchHandler 
                                                    = new VirtuosoKeywordSearchHandler();
    
    public VirtuosoWrapperRepositoryConnection(Repository repository,
            RepositoryConnection delegate) {
        super(repository, delegate);
    }

    @Override
    public Query prepareQuery(QueryLanguage ql, String query, String base)
            throws RepositoryException, MalformedQueryException {
        if (SPARQL.equals(ql)) {
            String strippedQuery = QueryParserUtil.removeSPARQLQueryProlog(query).toUpperCase();
            if (strippedQuery.startsWith("SELECT")) {
                return prepareTupleQuery(ql, query, base);
            } else if (strippedQuery.startsWith("ASK")) {
                return prepareBooleanQuery(ql, query, base);
            } else {
                return prepareGraphQuery(ql, query, base);
            }
        }
        throw new UnsupportedOperationException("Unsupported query language " + ql);
    }

    @Override
    public BooleanQuery prepareBooleanQuery(QueryLanguage ql, String query, String base)
            throws RepositoryException, MalformedQueryException {
        // Virtuoso does not support ASK queries, so we send an equivalent SELECT query
        // and return True if it returns results and false otherwise.
        String selectQueryString = SparqlUtil.transformAskToSelect(query);
        TupleQuery tupleQuery = prepareTupleQuery(selectQueryString);
        VirtuosoWrapperBooleanQuery wrapperQuery = new VirtuosoWrapperBooleanQuery(query,
                tupleQuery);
        return wrapperQuery;
    }

    @Override
    public GraphQuery prepareGraphQuery(QueryLanguage ql, String query, String base)
            throws RepositoryException, MalformedQueryException {
        ParsedGraphQuery parsedQuery = QueryParserUtil.parseGraphQuery(ql, query, base);
        String targetQuery = generateTargetQuery(parsedQuery);
        logger.trace("Prepared target graph query: " + targetQuery);
        return super.prepareGraphQuery(ql, targetQuery, base);
    }

    @Override
    public TupleQuery prepareTupleQuery(QueryLanguage ql, String query, String base)
            throws RepositoryException, MalformedQueryException {
        ParsedTupleQuery parsedQuery = QueryParserUtil.parseTupleQuery(ql, query, base);
        String targetQuery = generateTargetQuery(parsedQuery);
        logger.trace("Prepared target tuple query: " + targetQuery);
        return super.prepareTupleQuery(ql, targetQuery, base);
    }

    protected String generateTargetQuery(ParsedQuery parsedQuery) {
        VirtuosoKeywordSearchGroupExtractor extractor = new VirtuosoKeywordSearchGroupExtractor();

        TupleExpr tupleExpr = parsedQuery.getTupleExpr();
        extractor.optimize(tupleExpr, null, new MapBindingSet());
        if (extractor.containsKeywordClauses()) {
            tupleExpr = extractor.getTupleExpr();
            parsedQuery.setTupleExpr(tupleExpr);
            return keywordSearchHandler.generateTargetQuery(parsedQuery);
        } else {
            return parsedQuery.getSourceString();
        }
    }

    /**
     * Overridden to use the Virtuoso-specific workaround for ASK queries
     */
    @Override
    public boolean hasStatement(Resource subj, IRI pred, Value obj, boolean includeInferred,
            Resource... contexts) throws RepositoryException {
        try {
            BooleanQuery query = prepareBooleanQuery(SPARQL, SOMETHING, "");
            setBindings(query, subj, pred, obj, contexts);
            return query.evaluate();
        } catch (MalformedQueryException e) {
            throw new RepositoryException(e);
        } catch (QueryEvaluationException e) {
            throw new RepositoryException(e);
        }
    }

    @Override
    public boolean hasStatement(Statement st, boolean includeInferred, Resource... contexts)
            throws RepositoryException {
        return hasStatement(st.getSubject(), st.getPredicate(), st.getObject(), includeInferred, contexts);
    }
    
    /**
     * A copy-paste of the private method from {@link SPARQLConnection} 
     * 
     * @param query
     * @param subj
     * @param pred
     * @param obj
     * @param contexts
     * @throws RepositoryException
     */
    protected void setBindings(Query query, Resource subj, IRI pred, Value obj,
            Resource... contexts) throws RepositoryException {
        if (subj != null) {
            query.setBinding("s", subj);
        }
        if (pred != null) {
            query.setBinding("p", pred);
        }
        if (obj != null) {
            query.setBinding("o", obj);
        }
        if (contexts != null && contexts.length > 0) {
            SimpleDataset dataset = new SimpleDataset();
            for (Resource ctx : contexts) {
                if (ctx == null || ctx instanceof IRI) {
                    dataset.addDefaultGraph((IRI) ctx);
                } else {
                    throw new RepositoryException("Contexts must be URIs");
                }
            }
            query.setDataset(dataset);
        }
    } 

}
