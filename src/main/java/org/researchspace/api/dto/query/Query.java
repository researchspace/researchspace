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
package org.researchspace.api.dto.query;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.ParsedOperation;
import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.api.dto.base.DTOBase;
import org.researchspace.api.sparql.SparqlUtil;

/**
 * Abstract base class representing a query template, including information
 * about the query itself and the template parameters. Instantiated by concrete
 * classes for the different SPARQL query forms such as ASK, DESCRIBE, SELECT,
 * and CONSTRUCT.
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

    public Query(final Resource id, final String label, final String description, final String queryString) {

        super(id, label, description);

        this.queryString = queryString;
    }

    public Query(final Resource id, final String label, final String description, final String queryString,
            Map<String, String> standardPrefixes) {

        this(id, label, description, queryString);
        this.standardPrefixes = standardPrefixes;
    }

    public T getQuery() throws InconsistentDtoException {

        try {
            return getQueryInternal();
        } catch (MalformedQueryException e) {

            throw new InconsistentDtoException(this.getClass(), "Query object could not be parsed: " + e, getId());

        } catch (ClassCastException e) {
            throw new InconsistentDtoException(this.getClass(), "Query object could not be cast to target type: " + e,
                    getId());
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
        // Note: the utility class makes sure to not pre-pend already defined prefixes
        return SparqlUtil.prependPrefixes(this.queryString, this.standardPrefixes);
    }

}
