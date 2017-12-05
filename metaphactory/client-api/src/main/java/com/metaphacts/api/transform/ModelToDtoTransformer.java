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
package com.metaphacts.api.transform;

import org.eclipse.rdf4j.model.Model;

/**
 * Interface for Model-to-DTO transformation and back.
 * T is the base type of the DTO to which the transformer
 * applies.
 * 
 * @author msc
 */
public interface ModelToDtoTransformer<T> {

	/**
	 * Transform the model to a DTO.
	 */
	public T modelToDto(final Model m) throws InvalidModelException;
	
	/**
	 * Transform the DTO back to a model.
	 */
	public Model dtoToModel(final T dto);
}