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
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryException;

/**
 * Interface for plain SPARQL endpoint access functionality via Sesame. This might
 * be initialized with the platform endpoint or using other, standard-compliant endpoints.
 *
 * @author msc
 */
public interface SPARQLEndpointAPIClient {

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
	throws RepositoryException, MalformedQueryException, QueryEvaluationException;

}
