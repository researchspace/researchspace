/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.rest.client;

import java.util.List;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;

/**
 * Basic functionality of the LDP API retrieving contained objects as RDF
 * {@link Model}s.
 * 
 * @author msc, an
 */
public interface LDPAPIClient {

    /**
     * Return the IDs of all objects contained in the LDP container.
     */
    public List<Resource> getContainedObjects() throws APICallFailedException;

    /**
     * Return the model associated with the given object. Does not verify that the
     * object is in the given container.
     */
    public Model getObjectModel(Resource object) throws APICallFailedException;
}