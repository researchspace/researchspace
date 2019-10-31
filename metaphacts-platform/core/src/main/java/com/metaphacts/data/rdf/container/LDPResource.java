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

import java.util.Set;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.metaphacts.vocabulary.LDP;

/**
 * <p>
 * Interface for common operations to be performed on LDPResources.
 * </p>
 *
 * Please never implement {@link LDPResource} directly, but extend
 * {@link AbstractLDPResource} instead.

 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public interface LDPResource {

    /**
     * A collection of {@link Statement}s being the content "body" of the
     * {@link LDPResource} that will be returned to any client (whether it is a
     * java client accessing the java interfaces or a rest client).
     *
     * <p>
     * Implementation can "virtually" add or hide information i.e.
     * {@link Statement}s as required. For example, a custom implementation can
     * return automatically all information of pending child resource or may add
     * virtual rdf:types.
     * </p>
     *
     * <p>
     * <b>Please note</b> that this means at the same time that the returned
     * statements neither reflect what is physically stored in the database nor
     * can be used to add or delete statements.
     * </p>
     *
     * @return
     * @throws RepositoryException
     */
    public Model getModel() throws RepositoryException;

    public Model getModelRecursive();

    /**
     * Deletes the {@link LDPResource} from the repository. Implementations
     * <b>must</b> take care of recursive deletion of child resources.
     *
     * @throws RepositoryException
     */
    public void delete() throws RepositoryException;

    /**
     * The unique identifier of the {@link LDPResource}. It is assumed that
     * resources identifier used for {@link LDPResource} are unique within the
     * repository and under full control of the LDP implementation.
     *
     * @return {@link IRI}
     */
    public IRI getResourceIRI();

    /**
     * The {@link IRI} that identifies the context i.e. NamedGraph in which the
     * content "body" is physically stored. The context is the only resource
     * that can be used to manage the data physically.
     *
     * @return
     */
    public IRI getContextIRI();

    /**
     * @return a set of {@link IRI} with any of {@link LDP#Container},
     *         {@link LDP#Resource}
     */
    public Set<IRI> getLDPTypes();

    /**
     * Returns the {@link IRI} of the parent container or throws an
     * {@link RuntimeException} otherwise i.e. it should never happen that a
     * {@link LDPResource} has no or an invalid parent reference.
     *
     * @return {@link IRI} of the parent container
     */
    public IRI getParentContainer();

    /**
     * Whether the current resource is typed as {@link LDP#Container}.
     * @return
     */
    public boolean isContainer();
    
    boolean isOwner(IRI user);
}
