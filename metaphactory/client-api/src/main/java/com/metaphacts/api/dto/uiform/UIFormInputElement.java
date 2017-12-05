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
package com.metaphacts.api.dto.uiform;

import org.eclipse.rdf4j.model.IRI;

/**
 * Superclass for form components that allow user input, such as free text
 * input fields, drop down fields, or date pickers.
 * 
 * @author msc
 */
public abstract class UIFormInputElement extends UIFormElement {
	
	private static final long serialVersionUID = 7896776394071233294L;

	public UIFormInputElement(final IRI id, final String label, final String description) {
		
		super(id, label, description);
		
	}

}