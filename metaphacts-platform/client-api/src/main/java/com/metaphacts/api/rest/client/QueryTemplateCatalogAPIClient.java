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

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.dto.querytemplate.AskQueryTemplate;
import com.metaphacts.api.dto.querytemplate.ConstructQueryTemplate;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.dto.querytemplate.SelectQueryTemplate;
import com.metaphacts.api.dto.querytemplate.UpdateQueryTemplate;

/**
 * API for QueryTemplate catalog functionality, providing convenient access
 * to stored queries and CRUD operations.
 *
 * @author msc
 */
public interface QueryTemplateCatalogAPIClient extends LDPAPIDtoClient<QueryTemplate<?>>{

	/**
	 * Return all templates registered in the platform.
	 */
	public List<QueryTemplate<?>> getQueryTemplates() throws APICallFailedException;

	/**
	 * Retrun all SELECT templates registered in the platform.
	 */
	public List<SelectQueryTemplate> getSelectQueryTemplates() throws APICallFailedException;

	/**
	 * Return all ASK templates registered in the platform.
	 */
	public List<AskQueryTemplate> getAskQueryTemplates() throws APICallFailedException;

	/**
	 * Return all CONSTRUCT templates registered in the platform.
	 */
	public List<ConstructQueryTemplate> getConstructQueryTemplates() throws APICallFailedException;

	/**
     * Return all UPDATE templates registered in the platform.
     */
    public List<UpdateQueryTemplate> getUpdateQueryTemplates() throws APICallFailedException;

	/**
	 * Returns the QueryTemplate with the given {@link IRI}.
	 *
	 * @param queryId the templates's ID
	 * @return the QueryTemplate or null if the ID could not be resolved or does not reflect a query
	 */
	public QueryTemplate<?> getQueryTemplate(Resource queryId) throws APICallFailedException;

	/**
	 * Returns the SELECT QueryTemplate with the given {@link IRI}.
	 *
	 * @param queryId the templates's ID
	 * @return the QueryTemplate or null if the ID could not be resolved or does not reflect a SELECT query
	 */
	public SelectQueryTemplate getSelectQueryTemplate(Resource queryId) throws APICallFailedException;

	/**
	 * Returns the ASK QueryTemplate with the given {@link IRI}.
	 *
	 * @param queryId the templates's ID
	 * @return the QueryTemplate or null if the ID could not be resolved or does not reflect an ASK query
	 */
	public AskQueryTemplate getAskQueryTemplate(Resource queryId) throws APICallFailedException;


	/**
	 * Returns the CONSTRUCT QueryTemplate with the given {@link IRI}.
	 *
	 * @param queryId the templates's ID
	 * @return the QueryTemplate or null if the ID could not be resolved or does not reflect an CONSTRUCT query
	 */
	public ConstructQueryTemplate getConstructQueryTemplate(Resource queryId) throws APICallFailedException;


	/**
     * Returns the UPDATE QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not reflect an UPDATE query
     */
    public UpdateQueryTemplate getUpdateQueryTemplate(Resource queryId) throws APICallFailedException;

	// TODO: more to add here (add, remove, etc.)
}
