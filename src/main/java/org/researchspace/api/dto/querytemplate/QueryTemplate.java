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
package org.researchspace.api.dto.querytemplate;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.api.dto.base.DTOBase;
import org.researchspace.api.dto.query.Query;

/**
 * Abstract base class representing a query template, including information
 * about the query template itself and the template parameters. Instantiated by
 * concrete instances see {@link SelectQueryTemplate}, {@link AskQueryTemplate}
 * and {@link ConstructQueryTemplate}
 * 
 * Template parameter T is the type of the query template.
 * 
 * @author jt
 */
public abstract class QueryTemplate<T extends Query<?>> extends DTOBase {

    private static final long serialVersionUID = -3153405725541947787L;

    private T query;

    private List<QueryArgument> arguments = new ArrayList<QueryArgument>();

    private String labelTemplate = "";

    public QueryTemplate(Resource id, String label, String description, T query) {
        super(id, label, description);
        this.query = query;
    }

    /**
     * @return list of query arguments, empty list otherwise
     */
    public List<QueryArgument> getArguments() {
        return arguments;
    }

    public void addArguments(List<QueryArgument> arguments) {
        this.arguments.addAll(arguments);
    }

    public void addArgument(QueryArgument argument) {
        this.arguments.add(argument);
    }

    /**
     * Returns the {@link QueryArgument} with the specified IRI
     * 
     * @param argumentId
     * @return specified {@link QueryArgument}, <code>null</null> otherwise
     */
    public QueryArgument getArgument(IRI argumentId) {
        for (QueryArgument arg : this.arguments) {
            if (arg.getId().equals(argumentId))
                return arg;
        }
        return null;
    }

    /**
     * @return template string with placeholders {local name of the predicate
     *         argument}, <code>null</nulL> if it does not exist
     */
    public String getLabelTemplate() {
        return labelTemplate;
    }

    /**
     * Template string with place-holders for the variable names between { and } so
     * that user interfaces can render the template calls in a human-readable way.
     * 
     * @param labelTemplate
     */
    public void setLabelTemplate(String labelTemplate) {
        this.labelTemplate = labelTemplate;
    }

    public T getQuery() {
        return query;
    }

    public void setQuery(T query) {
        this.query = query;
    }

    @Override
    public void assertConsistency() throws InconsistentDtoException {

        super.assertConsistency();

        // only the ID is mandatory
        if (query == null) {
            throw new InconsistentDtoException(this.getClass(), "query is null", getId());
        }

        getQuery(); // validate syntax
    }

}