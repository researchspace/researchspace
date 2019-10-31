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

import org.eclipse.rdf4j.model.IRI;

import com.metaphacts.repository.MpRepositoryProvider;

/**
 * @author Denis Ostapenko
 */
@LDPR(iri = UserMetadataResource.URI_STRING)
public class UserMetadataResource extends AbstractLDPResource {
    public static final String URI_STRING = "http://www.metaphacts.com/ontologies/platform/userMetadataType";
    public static final IRI URI = vf.createIRI(URI_STRING);
    public static final String HAS_USER_STRING = "http://www.metaphacts.com/ontologies/platform#hasUser";
    public static final IRI HAS_USER = vf.createIRI(HAS_USER_STRING);

    public UserMetadataResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }
}
