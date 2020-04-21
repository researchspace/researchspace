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

package org.researchspace.services.fields;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.researchspace.vocabulary.XsdUtils;

import javax.annotation.Nullable;

enum RelationKind {
    Resource("resource", null), Literal("literal", RDFS.LITERAL), Date("date-range", XMLSchema.DATE),
    Numeric("numeric-range", XMLSchema.DECIMAL);

    public final String searchKind;
    public final IRI rangeCategory;

    RelationKind(String searchKind, @Nullable IRI rangeCategoryIri) {
        this.searchKind = searchKind;
        this.rangeCategory = rangeCategoryIri;
    }

    public static RelationKind fromFieldDatatype(IRI fieldId, IRI xsdDatatype) {
        if (xsdDatatype == null) {
            throw new RuntimeException("Field " + fieldId.stringValue() + " has unknown datatype!");
        } else if (XMLSchema.ANYURI.equals(xsdDatatype)) {
            return RelationKind.Resource;
        } else if (XsdUtils.isDateOrTimeDatatype(xsdDatatype)) {
            return RelationKind.Date;
        } else if (XsdUtils.isNumericDatatype(xsdDatatype)) {
            return RelationKind.Numeric;
        } else {
            return RelationKind.Literal;
        }
    }
}
