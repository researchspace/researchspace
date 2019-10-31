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
package com.metaphacts.api.dto;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.dto.base.DTOBase;

/**
 * Exception signalizing that a given DTO is not consistent, i.e. does not
 * satisfy its internal constraints. This might be due to member variables
 * not being initialized, but also cover more complex scenarios.
 * 
 * @author msc
 */
public class InconsistentDtoException extends Exception {

    private static final long serialVersionUID = 6373817276608638846L;

    public InconsistentDtoException(Class<? extends DTOBase> clazz, String msg, Resource id) {
        
        super("Dto object of type " + (clazz==null ? "null" : clazz.getSimpleName()) + 
                " with id " + id.stringValue() + " is inconsistent: " + msg);
        
    }
}