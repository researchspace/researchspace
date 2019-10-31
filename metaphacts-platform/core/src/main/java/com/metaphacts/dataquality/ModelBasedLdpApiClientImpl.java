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

package com.metaphacts.dataquality;

import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.vocabulary.RDF;

import com.metaphacts.api.rest.client.APICallFailedException;
import com.metaphacts.api.rest.client.LDPAPIClient;

/**
 * An implementation of a pseudo-LDP API client operating on top of an in-memory {@link Model}.
 * Assumed to contain all instances in the model that have an explicit rdf:type.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ModelBasedLdpApiClientImpl implements LDPAPIClient {
    
    protected final Model parentModel;

    public ModelBasedLdpApiClientImpl(Model parentModel) {
        this.parentModel = parentModel;
    }

    @Override
    public List<Resource> getContainedObjects() throws APICallFailedException {
        return parentModel.filter(
                null, RDF.TYPE, null).stream().map(stmt -> stmt.getSubject()).collect(Collectors.toList()
        );
    }

    @Override
    public Model getObjectModel(Resource object) throws APICallFailedException {
        return ShaclUtils.extractSubTreeBySubject(parentModel, object);
    }

}
