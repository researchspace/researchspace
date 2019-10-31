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

package com.metaphacts.federation.repository;

import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParser;
import org.eclipse.rdf4j.repository.sail.SailBooleanQuery;
import org.eclipse.rdf4j.repository.sail.SailGraphQuery;
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.repository.sail.SailTupleQuery;
import org.eclipse.rdf4j.sail.federation.MpFederationConnection;

import com.metaphacts.federation.sparql.parser.MpSPARQLParser;

/**
 * Custom implementation of {@link SailRepositoryConnection} 
 * for {@link MpFederationSailRepository}. Uses the custom {@link MpSPARQLParser}
 * to parse SELECT queries and extract custom aggregation functions.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationSailRepositoryConnection extends SailRepositoryConnection {

    public MpFederationSailRepositoryConnection(MpFederationSailRepository repository,
            MpFederationConnection sailConnection) {
        super(repository, sailConnection);
    }
    
    @Override
    public SailBooleanQuery prepareBooleanQuery(QueryLanguage ql, String queryString,
            String baseUri) throws MalformedQueryException {
        QueryParser parser = new MpSPARQLParser(
                ((MpFederationConnection) this.getSailConnection()).getFederation());
        ParsedQuery parsed = parser.parseQuery(queryString, baseUri);
        if (parsed instanceof ParsedBooleanQuery) {
            return new MpFederationSailBooleanQuery((ParsedBooleanQuery)parsed, this);
        }

        throw new IllegalArgumentException("query is not a boolean query: " + queryString);
    }

    @Override
    public SailTupleQuery prepareTupleQuery(QueryLanguage ql, String queryString, String baseUri)
            throws MalformedQueryException {
        QueryParser parser = new MpSPARQLParser(
                ((MpFederationConnection) this.getSailConnection()).getFederation());
        ParsedQuery parsed = parser.parseQuery(queryString, baseUri);
        if (parsed instanceof ParsedTupleQuery) {
            return new MpFederationSailTupleQuery((ParsedTupleQuery)parsed, this);
        }

        throw new IllegalArgumentException("query is not a tuple query: " + queryString);
    }
    
    
    @Override
    public SailGraphQuery prepareGraphQuery(QueryLanguage ql, String queryString, String baseUri) {
        QueryParser parser = new MpSPARQLParser(
                ((MpFederationConnection) this.getSailConnection()).getFederation());
        ParsedQuery parsed = parser.parseQuery(queryString, baseUri);
        if (parsed instanceof ParsedGraphQuery) {
            return new MpFederationSailGraphQuery((ParsedGraphQuery)parsed, this);
        }
        throw new IllegalArgumentException("query is not a graph query: " + queryString);
    }
    
    @Override
    public MpFederationConnection getSailConnection() {
        return (MpFederationConnection)super.getSailConnection();
    }
    
    
}