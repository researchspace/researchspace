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
import org.eclipse.rdf4j.repository.Repository;

import com.metaphacts.data.rdf.ModelUtils;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;

import com.metaphacts.config.NamespaceRegistry;

/**
 * {@link LDAPApiInterface} implementation that doesn't check for any permissions.
 * Should be used only by internal services. All external requests should be channeled through {@link PermissionsAwareLDPApi}.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class LDPApiInternal extends LDPApi implements LDPApiInterface {

    public LDPApiInternal(MpRepositoryProvider repositoryProvider, NamespaceRegistry ns) {
        super(repositoryProvider, ns);
    }

    @Override
    public LDPResource createLDPResource(Optional<String> slug, RDFStream stream,
            IRI targetContainer, String instanceBase) {
        return super.createLDPResource(slug, stream, targetContainer, instanceBase, this::noneContainerCheck);
    }

    /**
     * A method to save an already prepared model for a new LDP resource.
     * It is assumed that the IRI of the resource to be saved should be preserved "as is"
     * without artificially constructing a new one.
     *
     * @param graphFrom a {@link PointedGraph} containing the model to be saved and the IRI of the new LDP resource
     * @param targetContainer target LDP container
     * @return
     */
    public LDPResource createLDPResource(PointedGraph graphFrom, IRI targetContainer) {
        LDPResource target = LDPImplManager.getLDPImplementation(targetContainer, getLDPTypesFromRepository(targetContainer), this.repositoryProvider);
        if(!LDPContainer.class.isAssignableFrom(target.getClass()))
            throw new IllegalArgumentException("Target resource " + targetContainer +" is not a container.");

        IRI createdResourceURI = ((LDPContainer) target).add(graphFrom);
        return getLDPResource(createdResourceURI);
    }

    @Override
    public LDPResource getLDPResource(IRI uri) {
        return super.getLDPResource(uri, this::noneResourceCheck);
    }

    @Override
    public LDPResource updateLDPResource(RDFStream stream, IRI resourceToUpdate) {
        return super.updateLDPResource(stream, resourceToUpdate, this::noneResourceCheck);
    }

    /**
     * A method to update an LDP resource using an already prepared model.
     * It is assumed that the IRI of the resource to be saved should be preserved "as is"
     * without artificially constructing a new one.
     *
     * @param graphFrom a {@link PointedGraph} containing the model to be saved.
     *          The resource serving as the pointer of the {@link PointedGraph} will
     *          be replaced with <code>resourceToUpdate</code>.
     * @param resourceToUpdate an existing LDP resource to be updated using <code>graphFrom</code>.
     * @return
     */
    public LDPResource updateLDPResource(PointedGraph graphFrom) {
        LDPResource toUpdate = getLDPResource(graphFrom.getPointer());
        return updatePointedGraph(graphFrom, toUpdate, toUpdate.getResourceIRI(), this::noneResourceCheck);
    }

    @Override
    public void deleteLDPResource(IRI uri) {
        super.deleteLDPResource(uri, this::noneResourceCheck);
    }

    @Override
    public Model exportLDPResource(List<IRI> iris) {
        return super.exportLDPResource(iris, this::noneResourceCheck);
    }

    @Override
    public Model exportLDPResource(IRI iri) {
        return super.exportLDPResource(iri, this::noneResourceCheck);
    }

    @Override
    public List<LDPResource> importLDPResource(Model resource, Set<IRI> possibleContainers, Optional<IRI> containerIRI,
            Set<IRI> unknownObjects, boolean force, String instanceBase) {
        return super.importLDPResource(
            resource, possibleContainers, containerIRI, unknownObjects,
            force, instanceBase, this::noneContainerCheck
        );
    }

    @Override
    public LDPResource copyLDPResource(Optional<String> slug, IRI uri, Optional<IRI> targetContainer, String instanceBase) {
        return super.copyLDPResource(slug, uri, targetContainer, instanceBase, this::noneResourceCheck, this::noneContainerCheck);
    }

    private void noneResourceCheck(IRI type, LDPResource resource) {}

    private void noneContainerCheck(LDPContainer container) {}
}
