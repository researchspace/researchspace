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

package com.metaphacts.ldptest;

import org.eclipse.rdf4j.model.IRI;

import com.metaphacts.data.rdf.container.AbstractLDPContainer;
import com.metaphacts.data.rdf.container.LDPContainer;
import com.metaphacts.data.rdf.container.LDPR;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;

/**
 * This is a test implementation of a {@link LDPContainer} being located in a
 * different package other than the default implementations
 * 
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@LDPR(iri=LDPTestContainer.iriString)
public class LDPTestContainer extends AbstractLDPContainer {
    public static final String iriString = "http://www.testcontainer.com";
    public static final IRI uri = vf.createIRI(iriString);
    public LDPTestContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public IRI getResourceType() {
        return LDP.Resource;
    }
}