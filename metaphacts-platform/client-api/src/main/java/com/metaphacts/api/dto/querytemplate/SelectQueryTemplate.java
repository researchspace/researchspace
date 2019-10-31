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
package com.metaphacts.api.dto.querytemplate;

import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.dto.query.SelectQuery;

/**
 * DTO class representing a SELECT query template, including information about the 
 * query itself and the template parameters.
 * 
 * @author jt
 */
public class SelectQueryTemplate extends QueryTemplate<SelectQuery> {

    private static final long serialVersionUID = 328034741419745539L;

	public SelectQueryTemplate(Resource id, String label, String description,
	        SelectQuery query) {
        super(id, label, description, query);
    }
    
}