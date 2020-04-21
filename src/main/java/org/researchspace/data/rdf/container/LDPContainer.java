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

import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.PointedGraph;

/**
 * <p>
 * Interface for common operations to be performed on {@link LDPContainer}.
 * Every container is at the same time a {@link LDPResource}.
 * </p>
 * 
 * Please never implement {@link LDPContainer} directly, but extend
 * {@link AbstractLDPContainer} instead.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public interface LDPContainer extends LDPResource {
    /**
     * @param pointedGraph {@link PointedGraph} where the pointer identifies the
     *                     root node of the resource to be created
     * @return {@link IRI} of the created node
     * @throws RepositoryException
     */
    public IRI add(PointedGraph pointedGraph) throws RepositoryException;

    /**
     * @param pointedGraph {@link PointedGraph} where the pointer identifies the
     *                     root node of the resource to be added
     * @throws RepositoryException
     */
    public void update(PointedGraph pointedGraph) throws RepositoryException;

    /**
     * Initialize will be called explicitly <b>after</b> creating the
     * {@link LDPContainer} object.
     * 
     * @throws RepositoryException
     */
    public void initialize() throws RepositoryException;

    /**
     * Returns all resources explicitly contained within the container via the
     * lpd:contains relation.
     * 
     * @return set of resources that are contained in the container or empty set
     *         otherwise
     * @throws RepositoryException
     */
    public Set<Resource> getContainedResources() throws RepositoryException;

    /**
     * Whether the container contains the specified resource via a direct
     * lpd:contains relation.
     */
    public boolean containsLDPResource(Resource resource);

    /**
     * Type of the resource that can be stored in the container.
     */
    IRI getResourceType();
}