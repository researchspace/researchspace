/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.rest.client;

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.query.AskQuery;
import org.researchspace.api.dto.query.ConstructQuery;
import org.researchspace.api.dto.query.DescribeQuery;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.query.SelectQuery;

/**
 * API for query catalog functionality, providing convenient access to stored
 * queries and CRUD operations.
 *
 * @author msc
 */
public interface QueryCatalogAPIClient extends LDPAPIDtoClient<Query<?>> {

    /**
     * Return all queries registered in the platform.
     */
    public List<Query<?>> getTemplates() throws APICallFailedException;

    /**
     * Retrun all SELECT queries registered in the platform.
     */
    public List<SelectQuery> getSelectQueries() throws APICallFailedException;

    /**
     * Return all ASK queries registered in the platform.
     */
    public List<AskQuery> getAskQueries() throws APICallFailedException;

    /**
     * Return all CONSTRUCT queries registered in the platform.
     */
    public List<ConstructQuery> getConstructQueries() throws APICallFailedException;

    /**
     * Return all DESCRIBE queries registered in the platform.
     */
    public List<DescribeQuery> getDescribeQueries() throws APICallFailedException;

    /**
     * Returns the query with the given {@link IRI}.
     *
     * @param queryId the query's ID
     * @return the query or null if the ID could not be resolved or does not reflect
     *         a query
     */
    public Query<?> getQuery(Resource queryId) throws APICallFailedException;

    /**
     * Returns the SELECT query with the given {@link IRI}.
     *
     * @param queryId the query's ID
     * @return the query or null if the ID could not be resolved or does not reflect
     *         a SELECT query
     */
    public SelectQuery getSelectQuery(Resource queryId) throws APICallFailedException;

    /**
     * Returns the ASK query with the given {@link IRI}.
     *
     * @param queryId the query's ID
     * @return the query or null if the ID could not be resolved or does not reflect
     *         an ASK query
     */
    public AskQuery getAskQuery(Resource queryId) throws APICallFailedException;

    /**
     * Returns the CONSTRUCT query with the given {@link IRI}.
     *
     * @param queryId the query's ID
     * @return the query or null if the ID could not be resolved or does not reflect
     *         an ASK query
     */
    public ConstructQuery getConstructQuery(Resource queryId) throws APICallFailedException;

    /**
     * Returns the DESCRIBE query with the given {@link IRI}.
     *
     * @param queryId the query's ID
     * @return the query or null if the ID could not be resolved or does not reflect
     *         a SELECT query
     */
    public DescribeQuery getDescribeQuery(Resource queryId) throws APICallFailedException;

    // TODO: more to add here (add, remove, etc.)
}
