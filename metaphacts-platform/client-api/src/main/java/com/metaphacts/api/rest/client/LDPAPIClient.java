/*
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package com.metaphacts.api.rest.client;

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.transform.InvalidModelException;

/**
 * Basic functionality of the LDP API retrieving contained objects as RDF {@link Model}s.
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