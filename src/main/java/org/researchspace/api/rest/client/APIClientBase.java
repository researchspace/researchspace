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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;

/**
 * Basic API client configuration and functionality.
 * 
 * @author msc
 */
public interface APIClientBase {

    /**
     * Get the API base HTTP endpoint.
     * 
     * @return the endpoint, null if not properly initialized
     */
    public String getEndpoint();

    /**
     * Get the user (basic auth). See also {@link APIClientBase#getPassword()}.
     */
    public String getUser();

    /**
     * Get the password (basic auth). See also {@link APIClientBase#getUser()}.
     */
    public String getPassword();

    /**
     * Return the base IRI needed for IRI construction.
     * 
     * @return
     */
    public IRI getBaseIri();

    /**
     * Submit a GET request against the API, returning the API's RDF output wrapped
     * into a {@link Model}.
     * 
     * @param relativePath the path relative to the endpoint (without leading /)
     * 
     * @return the model of statements in case of success
     */
    public Model submitGET(final String pathFromEndpoint) throws APICallFailedException;

}