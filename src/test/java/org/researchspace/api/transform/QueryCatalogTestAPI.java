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
package org.researchspace.api.transform;

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.query.AskQuery;
import org.researchspace.api.dto.query.ConstructQuery;
import org.researchspace.api.dto.query.DescribeQuery;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.query.SelectQuery;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.QueryCatalogAPIClient;
import org.researchspace.api.transform.InvalidModelException;

/**
 * Empty class returning one "static" {@link Query} instance i.e. for stubbing
 * 
 * @author jt
 *
 */
public class QueryCatalogTestAPI implements QueryCatalogAPIClient {

    private Query<?> query;

    public QueryCatalogTestAPI(Query<?> query) {
        this.query = query;
    }

    @SuppressWarnings("unused")
    private QueryCatalogTestAPI() {
    }

    public List<IRI> getContainedObjects() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    public Model getObjectModel(IRI object) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public Query<?> getObjectDto(Resource object) throws InvalidModelException, APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    public String getEndpoint() {
        // TODO Auto-generated method stub
        return null;
    }

    public IRI getBaseIri() {
        // TODO Auto-generated method stub
        return null;
    }

    public Model submitGET(String pathFromEndpoint) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<Query<?>> getTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<SelectQuery> getSelectQueries() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<AskQuery> getAskQueries() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<ConstructQuery> getConstructQueries() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<DescribeQuery> getDescribeQueries() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public Query<?> getQuery(Resource queryId) throws APICallFailedException {
        return this.query;
    }

    @Override
    public SelectQuery getSelectQuery(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public AskQuery getAskQuery(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public ConstructQuery getConstructQuery(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public DescribeQuery getDescribeQuery(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    public String getUser() {
        // TODO Auto-generated method stub
        return null;
    }

    public String getPassword() {
        // TODO Auto-generated method stub
        return null;
    }

}