/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.api.dto.uiform;

import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.vocabulary.QF;

/**
 * Class representing a form element providing free-text input capabilities,
 * such as one-line input elements or text areas.
 * 
 * @author msc
 */
public class TextInput extends UIFormInputElement {

    private static final long serialVersionUID = 203607751312165341L;

    public enum InputType {
        LINE, TEXTAREA
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
        if (inputType == null) {
            throw new InconsistentDtoException(this.getClass(), "inputType is null", getId());
        }

    }
}