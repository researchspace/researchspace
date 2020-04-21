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

import org.researchspace.vocabulary.QF;

/**
 * Class representing a dropdown element for value selection in forms. For now,
 * we support only single-value dropdowns, but this class may be extended on
 * demand.
 * 
 * @author msc
 */
public class Choice extends UIFormInputElement {

    private static final long serialVersionUID = 203607751312165341L;

    public Choice() {

        super(QF.UI_CHOICE_INDIVIDUAL, "Choice element",
                "Element for choosing value(s) from a list of predefined values.");

    }

    // no dedicated functionality for now
}