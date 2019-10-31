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

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.ParsedOperation;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;

import com.metaphacts.api.dto.InconsistentDtoException;
import com.metaphacts.api.dto.base.DTOBase;
import com.metaphacts.api.sparql.SparqlUtil;

import com.google.common.collect.Maps;

/**
 * Abstract base class representing a query template, including information about the query itself
 * and the template parameters. Instantiated by concrete classes for the different SPARQL query
 * forms such as ASK, DESCRIBE, SELECT, and CONSTRUCT.
 *
 * Template parameter T is the type of the query.
 *
 * @author msc
 */
public abstract class Query<T extends ParsedOperation> extends DTOBase {

    private static final long serialVersionUID = -8716679499142458548L;

    // the query string
    String queryString;
    Map<String, String> standardPrefixes = new HashMap<>();

    public Query(final Resource id, final String label, final String description,
            final String queryString) {

        super(id, label, description);

        this.queryString = queryString;
    }

    public Query(final Resource id, final String label, final String description,
            final String queryString, Map<String, String> standardPrefixes) {

        this(id, label, description, queryString);
        this.standardPrefixes = standardPrefixes;
    }

    @SuppressWarnings("unchecked")
    public T getQuery() throws InconsistentDtoException {

        try {
            return getQueryInternal();
        } catch (MalformedQueryException e) {

            throw new InconsistentDtoException(this.getClass(),
                    "Query object could not be parsed: " + e, getId());

        } catch (ClassCastException e) {
            throw new InconsistentDtoException(this.getClass(),
                    "Query object could not be cast to target type: " + e, getId());
        }
    }

    protected abstract T getQueryInternal() throws MalformedQueryException, ClassCastException;

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
        if (queryString == null) {
            throw new InconsistentDtoException(this.getClass(), "queryString is null", getId());
        }

        getQuery(); // validate syntax
    }

    protected String prependPrefixes() {
        Set<String> mentionedPrefixes = SparqlUtil.extractPrefixes(this.queryString);
        
        Map<String, String> prefixesToAdd = Maps.newHashMap(this.standardPrefixes);
        for (String pre : mentionedPrefixes) {
            prefixesToAdd.remove(pre);
        }
        
        return SparqlUtil.prependPrefixes(this.queryString, prefixesToAdd);
    }

}
