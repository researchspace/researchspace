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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * Entry point providing singleton access to the platform's REST API clients.
 * 
 * @author msc
 */
public class PlatformRestClient {

	// endpoint base URL
	private String baseUrl;
	
	// for now, the URL of the SPARQL endpoint is hardcoded
	private static final String SPARQL_ENDPOINT_SUFFIX = "/sparql";
	
    public final static String BASE_IRI_STR = "http://www.metaphacts.com/";
    private final ValueFactory vf = SimpleValueFactory.getInstance();
	public final IRI BASE_IRI = vf.createIRI(BASE_IRI_STR);
	
	
	private final IRI LDP_CONTAINER_QUERY_CATALOG = 
		vf.createIRI("http://www.metaphacts.com/ontologies/platform#queryCatalog");

	private final IRI LDP_CONTAINER_QUERY_TEMPLATE_CATALOG = 
	        vf.createIRI("http://www.metaphacts.com/ontologies/platform#queryTemplateCatalog");
	
	
	private final IRI LDP_CONTAINER_QUERY_FORM_CATALOG = 
		vf.createIRI("http://www.metaphacts.com/ontologies/platform#queryFormCatalog");
	
	// convenient access to the SPARQL endpoint
	private SPARQLEndpointAPIClient sparqlEndpointApi;
	
	// access to the query catalog API
	private QueryCatalogAPIClient queryCatalogApi;

	private QueryTemplateCatalogAPIClient queryTemplateCatalogApi;

	// access to the form-based query instantiation catalog API
	private QueryFormCatalogAPIClient queryFormCatalogApi;

	public PlatformRestClient(
	    String baseUrl, final String user, final String password) throws APIInitializationException {

		if (baseUrl==null || baseUrl.isEmpty()) {
			throw new APIInitializationException("Endpoint URL null or empty", null);
		}
		
		this.baseUrl = 
			baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length()-1) : baseUrl;
		
		// in the following, initialize the APIs in valid order
		sparqlEndpointApi = 
		    new SPARQLEndpointAPIClientImpl(
		        this.baseUrl + SPARQL_ENDPOINT_SUFFIX, user, password);
			
		queryCatalogApi = 
			new QueryCatalogAPIClientImpl(
			    this.baseUrl, user, password, LDP_CONTAINER_QUERY_CATALOG, BASE_IRI);
		
		queryTemplateCatalogApi = 
		    new QueryTemplateCatalogAPIClientImpl(
		        this.baseUrl, user, password, LDP_CONTAINER_QUERY_TEMPLATE_CATALOG, 
		        BASE_IRI, queryCatalogApi);
		
		queryFormCatalogApi = 
			new QueryFormCatalogAPIClientImpl(
				this.baseUrl, user, password, LDP_CONTAINER_QUERY_FORM_CATALOG, 
				BASE_IRI, queryTemplateCatalogApi);
	}
	
	public QueryCatalogAPIClient getQueryCatalogAPI() {
		return queryCatalogApi;
	}
	
	public QueryFormCatalogAPIClient getQueryFormCatalogAPI() {
		return queryFormCatalogApi;
	}
	
	public SPARQLEndpointAPIClient getSparqlEndpointAPI() {
		return sparqlEndpointApi;
	}
}
