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

import com.google.common.collect.ImmutableSet;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;

import java.util.Set;

public final class XsdUtils {
    private XsdUtils() {
    }

    private static final Set<IRI> INTEGER_DATATYPES = ImmutableSet.of(XMLSchema.BYTE, XMLSchema.SHORT, XMLSchema.INT,
            XMLSchema.INTEGER, XMLSchema.NON_NEGATIVE_INTEGER, XMLSchema.NON_POSITIVE_INTEGER,
            XMLSchema.POSITIVE_INTEGER, XMLSchema.LONG, XMLSchema.UNSIGNED_BYTE, XMLSchema.UNSIGNED_SHORT,
            XMLSchema.UNSIGNED_INT, XMLSchema.UNSIGNED_LONG);

    public static boolean isDateOrTimeDatatype(IRI datatype) {
        return XMLSchema.DATE.equals(datatype) || XMLSchema.TIME.equals(datatype)
                || XMLSchema.DATETIME.equals(datatype);
    }

    public static boolean isNumericDatatype(IRI datatype) {
        return isIntegerDatatype(datatype) || isFloatDatatype(datatype);
    }

    public static boolean isIntegerDatatype(IRI datatype) {
        return INTEGER_DATATYPES.contains(datatype);
    }

    public static boolean isFloatDatatype(IRI datatype) {
        return (XMLSchema.DECIMAL.equals(datatype) || XMLSchema.FLOAT.equals(datatype)
                || XMLSchema.DOUBLE.equals(datatype));
    }
}
