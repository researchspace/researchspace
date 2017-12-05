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

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.metaphacts.api.transform.InvalidModelException;
import com.metaphacts.api.transform.ModelToDtoTransformer;

/**
 * Default implementation of {@link LDPAPIClient}.
 * 
 * @author msc
 */
public class LDPAPIClientImpl<T> extends APIClientBaseImpl implements LDPAPIClient<T> {

	public static final IRI LDP_CONTAINS = SimpleValueFactory.getInstance().createIRI("http://www.w3.org/ns/ldp#contains");
	
	private IRI containerId;
	
	private ModelToDtoTransformer<T> transformer;
		
	public LDPAPIClientImpl(
		final String endpoint, final String user, final String password,
		final IRI containerId, final IRI baseIri, 
		final ModelToDtoTransformer<T> transformer) {
		
		super(endpoint, user, password, baseIri);
		
		this.containerId = containerId;
		this.transformer = transformer;
	}

	public IRI getContainerId() {
		return containerId;
	}

	@Override
	public List<IRI> getContainedObjects() throws APICallFailedException {

		final String ldpRequest = 
			ldpContainerContentRequestString(getContainerId().toString());

		final Model containedObjectsModel = getContainedObjectsModel(ldpRequest);
		
		final List<IRI> containedObjects = new LinkedList<IRI>();
		
		if (containedObjectsModel!=null) {
			
			for (Value obj : containedObjectsModel.objects()) {
				
				if (obj instanceof IRI) {
					containedObjects.add((IRI)obj);					
				}
				
			}
		}
		
		return containedObjects;
		
	}

	@Override
	public Model getObjectModel(IRI object) throws APICallFailedException {
		
		if (object==null) {
			return null;
		}
		
		final String ldpRequest =  
			ldpContainerContentRequestString(object.toString());
		
		return super.submitGET(ldpRequest);

	}	
	
	@Override
	public T getObjectDto(IRI object) throws InvalidModelException, APICallFailedException {
		
		if (transformer==null) {
			throw new UnsupportedOperationException();
		}
		
		if (object==null) {
			return null;
		}
		
		final Model model = getObjectModel(object);
		
		return model==null ? null : transformer.modelToDto(model);
		
	}


	public Model getContainedObjectsModel(final String pathFromEndpoint) throws APICallFailedException  {
		
		// get the complete model
		final Model model = super.submitGET(pathFromEndpoint);
		
		// refine the model to the contained resources
		return model.filter(null, LDP_CONTAINS, null);
	
	}
	
	/**
	 * Constructs an LDP request against the given iri (relative to,
	 * but not including the endpoint).
	 * 
	 * @param iri
	 * @return
	 */
	private String ldpContainerContentRequestString(String iri) {
		
		final StringBuffer buf = new StringBuffer();
		buf.append("container?uri=");
		buf.append(iri.replace("#", "%23"));
		
		return buf.toString();
	}
}