/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.sparql.renderer;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.util.Literals;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLUtil;
import org.eclipse.rdf4j.queryrender.RenderUtils;

class MpSparqlQueryRendererUtils {

    private MpSparqlQueryRendererUtils() {
    }

    /**
     * The standard {@link RenderUtils#toSPARQL(Value, StringBuilder)} fails with literals (adds
     * extra brackets and messes language tags).
     *
     */
    public static void writeAsSparqlValue(Value value, StringBuilder builder, boolean explicitDatatype) {
        if (value instanceof IRI) {
            IRI uri = (IRI) value;
            builder.append("<").append(uri.toString()).append(">");
        } else if (value instanceof BNode) {
            builder.append("_:").append(((BNode) value).getID());
        } else if (value instanceof Literal) {
            Literal lit = (Literal) value;

            builder.append("\"").append(SPARQLUtil.encodeString(lit.stringValue())).append("\"");
            if (Literals.isLanguageLiteral(lit)) {
                builder.append("@").append(lit.getLanguage().get());
            } else if (lit.getDatatype().equals(XMLSchema.STRING) && !explicitDatatype) {
                // We don't render the xsd:string datatype in certain places, e.g., inside functions
            } else {
                builder.append("^^<").append(lit.getDatatype().stringValue()).append(">");
            }
        }
    }

}
