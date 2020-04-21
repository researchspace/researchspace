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

import org.eclipse.rdf4j.model.IRI;

/**
 * Superclass for form components that allow user input, such as free text input
 * fields, drop down fields, or date pickers.
 * 
 * @author msc
 */
public abstract class UIFormInputElement extends UIFormElement {

    private static final long serialVersionUID = 7896776394071233294L;

    public UIFormInputElement(final IRI id, final String label, final String description) {

        super(id, label, description);

    }

}