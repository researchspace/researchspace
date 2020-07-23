/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author ArtemKozlov <ak@metaphacts.com>
 */
public class PLATFORM {

    public static String NAMESPACE = "http://www.researchspace.org/resource/system/";

    /**
     * Types
     */
    public static final IRI FIELD;

    /**
     * Individuals
     */
    public static final IRI ANONYMOUS_USER_INDIVIDUAL;
    public static final IRI SYSTEM_USER_INDIVIDUAL;

    public static final IRI SET_TYPE;
    public static final IRI SET_ITEM_TYPE;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        FIELD = f.createIRI(NAMESPACE, "Field");
        ANONYMOUS_USER_INDIVIDUAL = f.createIRI(NAMESPACE, "anonymousUser");
        SYSTEM_USER_INDIVIDUAL = f.createIRI(NAMESPACE, "systemUser");
        SET_TYPE = f.createIRI(NAMESPACE, "Set");
        SET_ITEM_TYPE = f.createIRI(NAMESPACE, "SetItem");
    }

}
