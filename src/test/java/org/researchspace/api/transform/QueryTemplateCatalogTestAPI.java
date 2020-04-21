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
import org.researchspace.api.dto.querytemplate.AskQueryTemplate;
import org.researchspace.api.dto.querytemplate.ConstructQueryTemplate;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.querytemplate.SelectQueryTemplate;
import org.researchspace.api.dto.querytemplate.UpdateQueryTemplate;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClient;
import org.researchspace.api.transform.InvalidModelException;

/**
 * Empty class returning one "static" {@link QueryTemplate} instance i.e. for
 * stubbing
 * 
 * @author jt
 *
 */
public class QueryTemplateCatalogTestAPI implements QueryTemplateCatalogAPIClient {

    private QueryTemplate<?> queryTemplate;

    public QueryTemplateCatalogTestAPI(QueryTemplate<?> queryTemplate) {
        this.queryTemplate = queryTemplate;
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
    public QueryTemplate<?> getObjectDto(Resource object) throws InvalidModelException, APICallFailedException {
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
    public List<QueryTemplate<?>> getQueryTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<SelectQueryTemplate> getSelectQueryTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<AskQueryTemplate> getAskQueryTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<ConstructQueryTemplate> getConstructQueryTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<UpdateQueryTemplate> getUpdateQueryTemplates() throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public QueryTemplate<?> getQueryTemplate(Resource queryId) throws APICallFailedException {
        return this.queryTemplate;
    }

    @Override
    public SelectQueryTemplate getSelectQueryTemplate(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public AskQueryTemplate getAskQueryTemplate(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public ConstructQueryTemplate getConstructQueryTemplate(Resource queryId) throws APICallFailedException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public UpdateQueryTemplate getUpdateQueryTemplate(Resource queryId) throws APICallFailedException {
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