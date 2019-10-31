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

import com.metaphacts.vocabulary.QF;

/**
 * Class representing a dropdown element for value selection in forms.
 * For now, we support only single-value dropdowns, but this class may
 * be extended on demand.
 * 
 * @author msc
 */
public class Choice extends UIFormInputElement {
	
	private static final long serialVersionUID = 203607751312165341L;

	public Choice() {
		
	    super(QF.UI_CHOICE_INDIVIDUAL, "Choice element", "Element for choosing value(s) from a list of predefined values.");
		
	}

	// no dedicated functionality for now
}