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
package org.researchspace.api.dto.base;

import java.io.Serializable;

import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.InconsistentDtoException;

/**
 * Base class for all REST DTOs, providing common base functionality to access
 * the ID (=IRI), label, and description of the resource underlying the DTO.
 * 
 * @author msc
 */
public class DTOBase implements Serializable {

    private static final long serialVersionUID = -6825861105426356559L;

    public final static String BASE_IRI_STR = "http://www.researchspace.org/";

    // IRI identifying the object
    Resource id;

    // label of the form element (aka rdfs:label)
    String label;

    // human-readable description of the form element (aka rdfs:description)
    String description;

    public DTOBase(final Resource id, final String label, final String description) {

        this.id = id;
        this.label = label;
        this.description = description;

    }

    public Resource getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    /**
     * Check the consistency of the given DTO. May be overriden in subclasses,
     * verifying that mandatory fields are set and possible interdependencies
     * between fields are valid. Do *not* implement recursive assertions, i.e. do
     * *not* call assert of another DTO from within the assert method except for the
     * super class assert, where appropriate.
     * 
     * @throws InconsistentDtoException in case the DTO is not consistent
     */
    public void assertConsistency() throws InconsistentDtoException {
        // only the ID is mandatory
        if (id == null) {
            throw new InconsistentDtoException(this.getClass(), "ID not set", null /* unknown */);
        }
    }

}