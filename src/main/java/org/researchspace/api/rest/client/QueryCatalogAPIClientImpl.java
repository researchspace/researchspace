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

import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.query.AskQuery;
import org.researchspace.api.dto.query.ConstructQuery;
import org.researchspace.api.dto.query.DescribeQuery;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.query.SelectQuery;
import org.researchspace.api.transform.ModelToQueryTransformer;

/**
 * Default implementation of {@link QueryCatalogAPIClient}.
 *
 * @author msc
 */
public class QueryCatalogAPIClientImpl extends AbstractLDPAPIDtoClientImpl<Query<?>> implements QueryCatalogAPIClient {

    public QueryCatalogAPIClientImpl(final String endpoint, final String user, final String password,
            final IRI containerId, final IRI baseIri) {
        super(new RemoteLDPAPIClientImpl(endpoint, user, password, containerId, baseIri),
                new ModelToQueryTransformer());
    }

    public QueryCatalogAPIClientImpl(LDPAPIClient ldpAPIClient) {
        super(ldpAPIClient, new ModelToQueryTransformer());
    }

    public QueryCatalogAPIClientImpl(LDPAPIClient ldpAPIClient, Map<String, String> standardPrefixes) {
        super(ldpAPIClient, new ModelToQueryTransformer(standardPrefixes));
    }

    @Override
    public List<Query<?>> getTemplates() throws APICallFailedException {
        return getQueriesOfType(null);
    }

    @Override
    public List<SelectQuery> getSelectQueries() throws APICallFailedException {
        return getQueriesOfType(SelectQuery.class);
    }

    @Override
    public List<AskQuery> getAskQueries() throws APICallFailedException {
        return getQueriesOfType(AskQuery.class);
    }

    @Override
    public List<ConstructQuery> getConstructQueries() throws APICallFailedException {
        return getQueriesOfType(ConstructQuery.class);
    }

    @Override
    public List<DescribeQuery> getDescribeQueries() throws APICallFailedException {
        return getQueriesOfType(DescribeQuery.class);
    }

    @Override
    public Query<?> getQuery(Resource queryId) throws APICallFailedException {

        try {

            return getObjectDto(queryId);

        } catch (Exception e) {

            throw new APICallFailedException(
                    "Extraction of query '" + (queryId == null ? "null" : queryId) + "' from API failed", e);
        }
    }

    @Override
    public SelectQuery getSelectQuery(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, SelectQuery.class);
    }

    @Override
    public AskQuery getAskQuery(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, AskQuery.class);
    }

    @Override
    public ConstructQuery getConstructQuery(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, ConstructQuery.class);
    }

    @Override
    public DescribeQuery getDescribeQuery(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, DescribeQuery.class);
    }

    @SuppressWarnings("unchecked")
    protected <T extends Query<?>> List<T> getQueriesOfType(Class<T> clazzFilter) throws APICallFailedException {

        try {

            final List<T> queries = new LinkedList<T>();

            for (final Resource queryId : ldpAPIClient.getContainedObjects()) {

                final Query<?> queryDto = getObjectDto(queryId);

                if (queryDto != null) {

                    if (clazzFilter == null || clazzFilter.isAssignableFrom(queryDto.getClass())) {

                        queries.add((T) queryDto);
                    }
                }
            }

            return queries;

        } catch (Exception e) {

            throw new APICallFailedException("Extraction of queries of type "
                    + (clazzFilter == null ? "null" : clazzFilter.getSimpleName()) + " from API failed", e);

        }
    }

    @SuppressWarnings("unchecked")
    protected <T extends Query<?>> T getQueryOfType(Resource queryId, Class<T> clazz) throws APICallFailedException {

        try {

            final Query<?> queryDto = getObjectDto(queryId);

            return clazz.isAssignableFrom(queryDto.getClass()) ? (T) queryDto : null;

        } catch (Exception e) {

            throw new APICallFailedException("Extraction of query " + (queryId == null ? "null" : queryId) + " of type "
                    + (clazz == null ? "null" : clazz.getSimpleName()) + " from API failed", e);
        }
    }

}
