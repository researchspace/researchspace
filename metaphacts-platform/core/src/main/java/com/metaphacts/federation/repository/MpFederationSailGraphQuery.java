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

import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.repository.sail.SailGraphQuery;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.MpFederationConnection;

import com.metaphacts.federation.sparql.FederationSparqlAlgebraUtils;

public class MpFederationSailGraphQuery extends SailGraphQuery {

    public MpFederationSailGraphQuery(ParsedGraphQuery tupleQuery, MpFederationSailRepositoryConnection con) {
        super(tupleQuery, con);
    }

    @Override
    public GraphQueryResult evaluate() throws QueryEvaluationException {
        TupleExpr tupleExpr = getParsedQuery().getTupleExpr();
        MpFederationConnection federationConnection = this.getConnection().getSailConnection();
        if (FederationSparqlAlgebraUtils.executeOnSingleOwnerWithoutOptimization(tupleExpr,
                federationConnection.getFederation(),
                federationConnection.getDefaultMemberConnection())) {
            // Single owner query
            try {
                GraphQuery proxyQuery = federationConnection.getDefaultMemberConnection()
                        .prepareGraphQuery(getParsedQuery().getSourceString());
                return proxyQuery.evaluate();
            } catch (Exception e) {
                throw new SailException(
                        "Error while executing a single-owner query: " + e.getMessage(), e);
            }
        }
        return super.evaluate();
    }

    @Override
    protected MpFederationSailRepositoryConnection getConnection() {
        return (MpFederationSailRepositoryConnection)super.getConnection();
    }
}
