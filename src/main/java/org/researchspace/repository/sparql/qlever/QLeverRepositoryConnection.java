/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.repository.sparql.qlever;

import org.eclipse.rdf4j.http.client.SPARQLProtocolSession;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.researchspace.api.sparql.SparqlUtil;
import org.researchspace.repository.sparql.CustomSPARQLConnection;
import org.researchspace.repository.sparql.virtuoso.VirtuosoWrapperBooleanQuery;

/**
 * A wrapper connection for a QLever SPARQL repository.
 * 
 * Supports ASK queries, by transforming them into equivalent SELECT * {} LIMIT 1
 * 
 * @author Artem Kozlov
 */
public class QLeverRepositoryConnection extends CustomSPARQLConnection {
    public QLeverRepositoryConnection(SPARQLRepository repository, SPARQLProtocolSession client, boolean quadMode) {
        super(repository, client, quadMode);
    }

    @Override
    public BooleanQuery prepareBooleanQuery(QueryLanguage ql, String query, String base)
            throws RepositoryException, MalformedQueryException {
        String selectQueryString = SparqlUtil.transformAskToSelect(query);
        TupleQuery tupleQuery = prepareTupleQuery(selectQueryString);
        VirtuosoWrapperBooleanQuery wrapperQuery = new VirtuosoWrapperBooleanQuery(query, tupleQuery);
        return wrapperQuery;
    }
}
