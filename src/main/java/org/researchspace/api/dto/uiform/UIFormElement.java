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
import org.researchspace.api.dto.base.DTOBase;

/**
 * Superclass for basic form components, such as labels, dropdown lists, etc.
 * 
 * @author msc
 */
public abstract class UIFormElement extends DTOBase {

    private static final long serialVersionUID = 4066630520356683228L;

    public UIFormElement(final IRI id, final String label, final String description) {

        super(id, label, description);

    }

    // no dedicated functionality for now
}