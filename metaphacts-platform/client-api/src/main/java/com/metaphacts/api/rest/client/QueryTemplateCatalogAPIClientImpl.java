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
package com.metaphacts.api.rest.client;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.IRI;

import com.metaphacts.api.dto.queryform.QueryFormConfiguration;
import com.metaphacts.api.dto.querytemplate.AskQueryTemplate;
import com.metaphacts.api.dto.querytemplate.ConstructQueryTemplate;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.dto.querytemplate.SelectQueryTemplate;
import com.metaphacts.api.dto.querytemplate.UpdateQueryTemplate;
import com.metaphacts.api.transform.InvalidModelException;
import com.metaphacts.api.transform.ModelToQueryTemplateTransformer;

/**
 * Default implementation of {@link QueryCatalogAPIClient}.
 * 
 * @author msc
 */
public class QueryTemplateCatalogAPIClientImpl extends AbstractLDPAPIDtoClientImpl<QueryTemplate<?>> implements QueryTemplateCatalogAPIClient {

    /**
     * Constructor creating a new remote LDP API client. 
     * A preferable way is to pass LDPAPIClient as a parameter. 
     * 
     * @param endpoint
     * @param user
     * @param password
     * @param containerId
     * @param baseIri
     * @param queryCatalogApi
     */
    @Deprecated
	public QueryTemplateCatalogAPIClientImpl(
	    final String endpoint, final String user, final String password,
	    final IRI containerId, final IRI baseIri,
	    final QueryCatalogAPIClient queryCatalogApi) {
        
	    super(new RemoteLDPAPIClientImpl(endpoint, user, password, containerId, baseIri), new ModelToQueryTemplateTransformer(queryCatalogApi));
    }
	
	public QueryTemplateCatalogAPIClientImpl(final LDPAPIClient ldpAPIClient, final QueryCatalogAPIClient queryCatalogApi) {
	    super(ldpAPIClient, new ModelToQueryTemplateTransformer(queryCatalogApi));
	}

    @Override
	public List<QueryTemplate<?>> getQueryTemplates() throws APICallFailedException {
		return getQueriesOfType(null);
	}

	@Override
	public List<SelectQueryTemplate> getSelectQueryTemplates() throws APICallFailedException {
		return getQueriesOfType(SelectQueryTemplate.class);
	}
	
	@Override
	public List<AskQueryTemplate> getAskQueryTemplates() throws APICallFailedException {
		return getQueriesOfType(AskQueryTemplate.class);
	}

	@Override
	public List<ConstructQueryTemplate> getConstructQueryTemplates() throws APICallFailedException {
		return getQueriesOfType(ConstructQueryTemplate.class);
	}
	
	@Override
    public List<UpdateQueryTemplate> getUpdateQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(UpdateQueryTemplate.class);
    }
	
	@Override
	public QueryTemplate<?> getQueryTemplate(Resource queryId)  throws APICallFailedException {

	    try {
		    
            return getObjectDto(queryId);
            
        } catch (InvalidModelException e) {
           
            throw new APICallFailedException(
                "Extraction of template query " + queryId + " from API failed", e);
            
        }
	}

	@Override
	public SelectQueryTemplate getSelectQueryTemplate(Resource queryId) throws APICallFailedException {
		return getQueryOfType(queryId, SelectQueryTemplate.class);
	}

	@Override
	public AskQueryTemplate getAskQueryTemplate(Resource queryId) throws APICallFailedException {
		return getQueryOfType(queryId, AskQueryTemplate.class);
	}

	@Override
	public ConstructQueryTemplate getConstructQueryTemplate(Resource queryId) throws APICallFailedException {
		return getQueryOfType(queryId, ConstructQueryTemplate.class);
	}
	
	@Override
    public UpdateQueryTemplate getUpdateQueryTemplate(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, UpdateQueryTemplate.class);
    }
	
	@SuppressWarnings("unchecked")
	protected <T extends QueryTemplate<?>> List<T> getQueriesOfType(Class<T> clazzFilter) throws APICallFailedException {
	
		final List<T> queries = new LinkedList<T>();
		
		for (final Resource queryId : ldpAPIClient.getContainedObjects()) {
			
		    try {
		        final QueryTemplate<?> queryDto = getObjectDto(queryId);
		    
    			if (queryDto!=null) {
    				
    				if (clazzFilter==null || clazzFilter.isAssignableFrom(queryDto.getClass())) {
    					
    					queries.add((T)queryDto);
    				}
    			}
    			
            } catch (Exception e) {
                
                throw new APICallFailedException(
                    "Extraction of template query " + queryId + " of class " + 
                    (clazzFilter==null ? "null" : clazzFilter.getClass().getSimpleName()) + " failed", e);
                
            }

		}
		
		return queries;
	}

	@SuppressWarnings("unchecked")
	protected <T extends QueryTemplate<?>> T getQueryOfType(Resource queryId, Class<T> clazz) throws APICallFailedException {

	    try {
	        
    		final QueryTemplate<?> queryDto = getObjectDto(queryId);
    		
    		return clazz.isAssignableFrom(queryDto.getClass()) ? (T)queryDto : null;
    		
	    } catch (Exception e) {
	        
            throw new APICallFailedException(
                "Extraction of template query " + queryId + " of class " + 
                (clazz==null ? "null" : clazz.getClass().getSimpleName()) + " failed", e);
	    }
	}


}