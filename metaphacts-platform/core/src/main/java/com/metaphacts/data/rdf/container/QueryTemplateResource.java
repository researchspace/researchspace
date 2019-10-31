/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.data.rdf.container;

import java.util.List;

import javax.inject.Inject;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.metaphacts.querycatalog.QueryCatalogRESTService;
import com.metaphacts.querycatalog.QueryCatalogRESTServiceRegistry;
import com.metaphacts.repository.MpRepositoryProvider;

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
        List<QueryCatalogRESTService> services 
            = queryCatalogRESTServiceRegistry.getServicesByTemplateIri(this.getResourceIRI());
        
        if (!services.isEmpty()) {
            throw new IllegalStateException("Could not delete the query template <" 
                    + this.getResourceIRI().stringValue() 
                    + ">: it is referenced by exposed REST API services.");
        }
        
        super.delete();
    }
    
    

}
