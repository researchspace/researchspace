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

import java.util.Map;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;

public class DescribeQuery extends Query<ParsedGraphQuery> {

    private static final long serialVersionUID = -2429079263123193019L;

    public DescribeQuery(final Resource id, final String label, final String description, final String queryString) {

        super(id, label, description, queryString);

    }

    public DescribeQuery(final Resource id, final String label, final String description, final String queryString,
            Map<String, String> standardPrefixes) {
        super(id, label, description, queryString, standardPrefixes);
    }

    @Override
    protected ParsedGraphQuery getQueryInternal() throws MalformedQueryException, ClassCastException {
        SPARQLParser parser = new SPARQLParser();
        return (ParsedGraphQuery) parser.parseQuery(prependPrefixes(), BASE_IRI_STR);
    }

}
