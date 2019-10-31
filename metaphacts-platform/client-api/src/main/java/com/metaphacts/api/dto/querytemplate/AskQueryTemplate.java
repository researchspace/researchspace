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

import com.metaphacts.api.dto.query.AskQuery;

/**
 * DTO class representing an ASK query template, including information about the 
 * query itself and the template parameters.
 * 
 * @author msc
 */
public class AskQueryTemplate extends QueryTemplate<AskQuery> {

    private static final long serialVersionUID = 4146850204104814610L;

	public AskQueryTemplate(Resource id, String label, String description, AskQuery query) {
        super(id, label, description, query);
    }

}