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
import java.util.Optional;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;

public interface LDPApiInterface {

    LDPResource getLDPResource(IRI  uri);
    LDPResource createLDPResource(Optional<String> slug, RDFStream stream,
            IRI targetResource, String instanceBase);
    LDPResource updateLDPResource(RDFStream stream, IRI resourceToUpdate);
    void deleteLDPResource(IRI uri);
    
    LDPResource copyLDPResource(Optional<String> slug, IRI uri,
            Optional<IRI> targetContainer, String instanceBase);
    Model exportLDPResource(List<IRI> iris);
    Model exportLDPResource(IRI iri);
    List<LDPResource> importLDPResource(Model resource, Set<IRI> possibleContainers,
            Optional<IRI> containerIRI, Set<IRI> unknownObjects, boolean force, String instanceBase);
}
