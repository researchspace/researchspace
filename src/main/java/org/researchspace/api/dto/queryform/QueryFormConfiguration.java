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
package org.researchspace.api.dto.queryform;

import java.util.Collection;

import org.eclipse.rdf4j.model.IRI;
import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.api.dto.base.DTOBase;
import org.researchspace.api.dto.querytemplate.QueryTemplate;

/**
 * POJO representing a query form configuration. Template type T represents the
 * query template type backing the configuration
 *
 * @author msc, jt
 */
public class QueryFormConfiguration<T extends QueryTemplate<?>> extends DTOBase {

    private static final long serialVersionUID = -4971495504331025542L;

    // the underlying query template
    private QueryTemplate<?> queryTemplate;

    // specification of the form elements and how they map to the query's template
    // parameters
    private Collection<QueryFormElement> queryFormElements;

    public QueryFormConfiguration(final IRI id, final String label, final String description,
            final QueryTemplate<?> queryTemplate, final Collection<QueryFormElement> queryFormElements) {

        super(id, label, description);

        this.queryTemplate = queryTemplate;
        this.queryFormElements = queryFormElements;
    }

    public QueryTemplate<?> getQueryTemplate() {
        return queryTemplate;
    }

    public void setQueryTemplate(QueryTemplate<?> queryTemplate) {
        this.queryTemplate = queryTemplate;
    }

    public Collection<QueryFormElement> getQueryFormElements() {
        return queryFormElements;
    }

    public void setQueryFormElements(Collection<QueryFormElement> queryFormElements) {
        this.queryFormElements = queryFormElements;
    }

    public QueryFormElement getQueryFormElement(IRI queryFormElementId) {
        for (QueryFormElement el : this.queryFormElements)
            if (el.getId().equals(queryFormElementId))
                return el;

        return null;
    }

    @Override
    public void assertConsistency() throws InconsistentDtoException {

        super.assertConsistency();

        // only the ID is mandatory
        if (queryTemplate == null) {
            throw new InconsistentDtoException(this.getClass(), "queryTemplate is null", getId());
        }
        if (queryFormElements == null) {
            throw new InconsistentDtoException(this.getClass(), "queryFormElements is null", getId());
        }
    }
}