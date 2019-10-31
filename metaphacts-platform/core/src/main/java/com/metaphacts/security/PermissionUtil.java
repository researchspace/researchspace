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

package com.metaphacts.security;

import org.apache.shiro.SecurityUtils;
import org.eclipse.rdf4j.model.IRI;

import com.metaphacts.api.sparql.SparqlUtil.SparqlOperation;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.Permissions.SPARQL;
import com.metaphacts.security.Permissions.PAGES;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class PermissionUtil {

    public static boolean hasSparqlPermission(SparqlOperation op, String repositoryId) {
        return (repositoryId.equals(RepositoryManager.DEFAULT_REPOSITORY_ID) 
                    && SecurityUtils.getSubject().isPermitted(SPARQL.sparqlOperationDefaultPermission(op)))
                || SecurityUtils.getSubject().isPermitted(SPARQL.sparqlOperationPermission(repositoryId, op));
    }
    
    public static boolean hasTemplateActionPermission(IRI iri, PAGES.Action action) {
        return (SecurityUtils.getSubject().isPermitted(PAGES.templateOperationPermission(iri, action)));
    }
}
