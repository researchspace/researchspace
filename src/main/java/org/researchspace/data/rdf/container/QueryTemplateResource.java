/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.data.rdf.container;

import java.util.List;

import javax.inject.Inject;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.querycatalog.QueryCatalogRESTService;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistry;
import org.researchspace.repository.MpRepositoryProvider;

@LDPR(iri = QueryTemplateResource.URI_STRING)
public class QueryTemplateResource extends AbstractLDPResource {

    // Can't use SPIN.TEMPLATE_CLASS, because a String constant is required
    public static final String URI_STRING = "http://spinrdf.org/spin#Template";

    @Inject
    protected QueryCatalogRESTServiceRegistry queryCatalogRESTServiceRegistry;

    public QueryTemplateResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public void delete() throws RepositoryException {
        List<QueryCatalogRESTService> services = queryCatalogRESTServiceRegistry
                .getServicesByTemplateIri(this.getResourceIRI());

        if (!services.isEmpty()) {
            throw new IllegalStateException("Could not delete the query template <"
                    + this.getResourceIRI().stringValue() + ">: it is referenced by exposed REST API services.");
        }

        super.delete();
    }

}
