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
import org.eclipse.rdf4j.model.Model;

/**
 * Basic API client configuration and functionality.
 * 
 * @author msc
 */
public interface APIClientBase {

	/**
	 * Get the API base HTTP endpoint.
	 * 
	 * @return the endpoint, null if not properly initialized
	 */
	public String getEndpoint();
	
	/**
	 * Get the user (basic auth). See also {@link APIClientBase#getPassword()}.
	 */
	public String getUser();
	
	/**
	 * Get the password (basic auth). See also {@link APIClientBase#getUser()}.
	 */
	public String getPassword();

	/**
	 * Return the base IRI needed for IRI construction.
	 * 
	 * @return
	 */
	public IRI getBaseIri();


	/**
	 * Submit a GET request against the API, returning the API's
	 * RDF output wrapped into a {@link Model}.
	 * 
	 * @param relativePath the path relative to the endpoint (without leading /)
	 * 
	 * @return the model of statements in case of success
	 */
	public Model submitGET(final String pathFromEndpoint) throws APICallFailedException;


}