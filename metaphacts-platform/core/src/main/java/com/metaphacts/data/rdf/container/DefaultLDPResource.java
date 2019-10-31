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
import org.eclipse.rdf4j.repository.Repository;

import com.metaphacts.repository.MpRepositoryProvider;

/**
 * Default implementation of a {@link LDPResource} i.e. if no custom
 * implementation is provided.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class DefaultLDPResource extends AbstractLDPResource {

    public DefaultLDPResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }


}