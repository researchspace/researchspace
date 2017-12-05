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
package com.metaphacts.api.dto.query;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;

import com.metaphacts.api.dto.InconsistentDtoException;
import com.metaphacts.api.dto.base.DTOBase;

/**
 * Abstract base class representing a query template, including information about the 
 * query itself and the template parameters. Instantiated by concrete classes for the
 * different SPARQL query forms such as ASK, DESCRIBE, SELECT, and CONSTRUCT.
 * 
 * Template parameter T is the type of the query.
 * 
 * @author msc 
 */
public abstract class Query<T extends ParsedQuery> extends DTOBase {
	
	private static final long serialVersionUID = -8716679499142458548L;

	// the query string
	String queryString;

	public Query(final IRI id, final String label, final String description, final String queryString) {

		super(id, label, description);
		
		this.queryString = queryString;
	}
	
	@SuppressWarnings("unchecked")
    public T getQuery() throws InconsistentDtoException {
	    
	    try {
	        
    	    final SPARQLParser parser = new SPARQLParser();
    		return (T)parser.parseQuery(queryString, BASE_IRI_STR); 
    		
	    } catch (MalformedQueryException e) {
	        
	        throw new InconsistentDtoException(
	            this.getClass(), "Query object could not be parsed: " + e, getId());
	        
	    } catch (ClassCastException e) {
	        throw new InconsistentDtoException(
                this.getClass(), "Query object could not be cast to target type: " + e, getId());
	    }
	}
	
	
	public String getQueryString() {
		return queryString;
	}

	public void setQueryString(String queryString) {
		this.queryString = queryString;
	}

	@Override
	public void assertConsistency() throws InconsistentDtoException {
	    
	    super.assertConsistency();
	    
	    // only the ID is mandatory
	    if (queryString==null) {
	        throw new InconsistentDtoException(this.getClass(), "queryString is null", getId());
	    }
	    
	    getQuery(); // validate syntax
	}
	
}