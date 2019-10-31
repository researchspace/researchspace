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
 * Superclass for form component allowing date input, typically implemented
 * via a GUI for date picking.
 * 
 * @author msc
 */
public class DatePicker extends UIFormInputElement {
	
	private static final long serialVersionUID = 7896776394071233294L;

	public DatePicker() {
		
	    super(QF.UI_DATEPICKER_INDIVIDUAL, "Datepicker Element", "Element for selecting a date.");
		
	}

	// no dedicated functionality for now
}