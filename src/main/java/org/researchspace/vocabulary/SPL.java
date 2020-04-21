/**
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 * Copyright (C) 2015-2017, metaphacts GmbH
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

public class SPL {
    public static String NAMESPACE = "http://spinrdf.org/spl#";

    public static IRI ARGUMENT_CLASS;

    public static IRI PREDICATE_PROPERTY;
    public static IRI VALUETYPE_PROPERTY;
    public static IRI OPTIONAL_PROPERTY;
    public static IRI DEFAULT_VALUE_PROPERTY;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        ARGUMENT_CLASS = f.createIRI(NAMESPACE, "Argument");

        PREDICATE_PROPERTY = f.createIRI(NAMESPACE, "predicate");
        VALUETYPE_PROPERTY = f.createIRI(NAMESPACE, "valueType");
        OPTIONAL_PROPERTY = f.createIRI(NAMESPACE, "optional");
        DEFAULT_VALUE_PROPERTY = f.createIRI(NAMESPACE, "defaultValue");
    }
}