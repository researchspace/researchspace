/*
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package com.metaphacts.api.transform;

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.dto.query.AskQuery;
import com.metaphacts.api.dto.query.ConstructQuery;
import com.metaphacts.api.dto.query.DescribeQuery;
import com.metaphacts.api.dto.query.Query;
import com.metaphacts.api.dto.query.SelectQuery;
import com.metaphacts.api.rest.client.APICallFailedException;
import com.metaphacts.api.rest.client.QueryCatalogAPIClient;

/**
 * Empty class returning one "static" {@link Query} instance i.e. for stubbing
 * @author jt
 *
 */
public class QueryCatalogTestAPI implements QueryCatalogAPIClient {

    private Query<?> query;
    public QueryCatalogTestAPI(Query<?> query){
        this.query=query;
    }
    
    @SuppressWarnings("unused")
    private QueryCatalogTestAPI(){}
    
    public List<IRI> getContainedObjects() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    public Model getObjectModel(IRI object) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    public Query<?> getObjectDto(Resource object) throws InvalidModelException,
        APICallFailedException {
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

    public Model submitGET(String pathFromEndpoint)
            throws APICallFailedException {
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
    public List<ConstructQuery> getConstructQueries()
            throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<DescribeQuery> getDescribeQueries()
            throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public Query<?> getQuery(Resource queryId) throws APICallFailedException {
       return (Query<?>) this.query;
    }

    @Override
    public SelectQuery getSelectQuery(Resource queryId)
            throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public AskQuery getAskQuery(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public ConstructQuery getConstructQuery(Resource queryId)
            throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public DescribeQuery getDescribeQuery(Resource queryId)
            throws APICallFailedException {
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