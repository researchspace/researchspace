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

import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;

/**
 * Manager class for data access.
 * 
 * @author msc
 */
public class SPARQLEndpointAPIClientImpl implements SPARQLEndpointAPIClient {

	private SPARQLRepository repo;
	
	/**
	 * Private singleton constructor
	 * @throws APIInitializationException 
	 * @throws RepositoryException 
	 */
	public SPARQLEndpointAPIClientImpl(
	    final String endpointURL, String user, String password) throws APIInitializationException {
	    
	    try {
	        init(endpointURL, user, password);
	    } catch (RepositoryException e) {
	        throw new APIInitializationException("SPARQL Endpoint initialization failed", e);
	    }
	}

	/**
	 * Initialize the SPARQL repository behind the data manager.
	 * 
	 * @param endpointURL
	 * @throws RepositoryException
	 */
	void init(final String endpointURL, final String user, final String password) 
	throws RepositoryException {
	    
		repo = new SPARQLRepository(endpointURL);
		repo.initialize();
		
		// set authentication credentials, if specified
	    if (user!=null && !user.isEmpty() && password!=null) {
	        repo.setUsernameAndPassword(user, password);
	    }

	}

	/**
	 * Submit a SPARQL SELECT query and return the {@link TupleQueryResult}.
	 * 
	 * @param queryString
	 * @return the tuple query result (essentially an iterator over the result)
	 * 
	 * @throws RepositoryException
	 * @throws MalformedQueryException
	 * @throws QueryEvaluationException
	 */
	public TupleQueryResult submitSPARQLSelectQuery(String queryString) 
	throws RepositoryException, MalformedQueryException, QueryEvaluationException {
		
		RepositoryConnection con = repo.getConnection();
		try {
			
			TupleQuery tupleQuery = con.prepareTupleQuery(QueryLanguage.SPARQL, queryString);
			return tupleQuery.evaluate();

		} finally {
			
			con.close();
			
		}
	}
	
}