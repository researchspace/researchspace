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

import com.metaphacts.api.dto.InconsistentDtoException;
import com.metaphacts.vocabulary.QF;

/**
 * Class representing a form element providing free-text input capabilities,
 * such as one-line input elements or text areas.
 * 
 * @author msc
 */
public class TextInput extends UIFormInputElement {
	
	private static final long serialVersionUID = 203607751312165341L;

	public enum InputType {
		LINE,
		TEXTAREA
	}
	
	// the type of the free-text input field (one line vs. text area)
	InputType inputType;
	
	public TextInput(final InputType inputType) {
		
		super(QF.UI_TEXT_INPUT_INDIVIDUAL, "Text Input", "Element for plain text input.");
		
		this.inputType = inputType;
		
	}

	public InputType getInputType() {
		return inputType;
	}

	public void setInputType(InputType inputType) {
		this.inputType = inputType;
	}
	
    @Override
    public void assertConsistency() throws InconsistentDtoException {
        
        super.assertConsistency();
        
        // only the ID is mandatory
        if (inputType==null) {
            throw new InconsistentDtoException(this.getClass(), "inputType is null", getId());
        }
        
    }
}