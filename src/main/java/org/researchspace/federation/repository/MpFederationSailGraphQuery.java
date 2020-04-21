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

package org.researchspace.federation.repository;

import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.repository.sail.SailGraphQuery;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.federation.MpFederationConnection;
import org.researchspace.federation.sparql.FederationSparqlAlgebraUtils;

public class MpFederationSailGraphQuery extends SailGraphQuery {

    public MpFederationSailGraphQuery(ParsedGraphQuery tupleQuery, MpFederationSailRepositoryConnection con) {
        super(tupleQuery, con);
    }

    @Override
    public GraphQueryResult evaluate() throws QueryEvaluationException {
        TupleExpr tupleExpr = getParsedQuery().getTupleExpr();
        MpFederationConnection federationConnection = this.getConnection().getSailConnection();
        if (FederationSparqlAlgebraUtils.executeOnSingleOwnerWithoutOptimization(tupleExpr,
                federationConnection.getFederation(), federationConnection.getDefaultMemberConnection())) {
            // Single owner query
            try {
                GraphQuery proxyQuery = federationConnection.getDefaultMemberConnection()
                        .prepareGraphQuery(getParsedQuery().getSourceString());
                return proxyQuery.evaluate();
            } catch (Exception e) {
                throw new SailException("Error while executing a single-owner query: " + e.getMessage(), e);
            }
        }
        return super.evaluate();
    }

    @Override
    protected MpFederationSailRepositoryConnection getConnection() {
        return (MpFederationSailRepositoryConnection) super.getConnection();
    }
}
