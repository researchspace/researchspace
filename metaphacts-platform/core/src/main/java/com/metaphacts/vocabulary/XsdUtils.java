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

package com.metaphacts.vocabulary;

import com.google.common.collect.ImmutableSet;
import org.semarglproject.vocab.XSD;

import java.util.Set;

public final class XsdUtils {
    private XsdUtils() {}

    private static final Set<String> INTEGER_DATATYPES = ImmutableSet.of(
        XSD.BYTE,
        XSD.SHORT,
        XSD.INT,
        XSD.INTEGER,
        XSD.NON_NEGATIVE_INTEGER,
        XSD.NON_POSITIVE_INTEGER,
        XSD.POSITIVE_INTEGER,
        XSD.LONG,
        XSD.UNSIGNED_BYTE,
        XSD.UNSIGNED_SHORT,
        XSD.UNSIGNED_INT,
        XSD.UNSIGNED_LONG
    );

    public static boolean isDateOrTimeDatatype(String datatype) {
        return XSD.DATE.equals(datatype) || XSD.TIME.equals(datatype) || XSD.DATE_TIME.equals(datatype);
    }

    public static boolean isNumericDatatype(String datatype) {
        return isIntegerDatatype(datatype) || isFloatDatatype(datatype);
    }

    public static boolean isIntegerDatatype(String datatype) {
        return INTEGER_DATATYPES.contains(datatype);
    }

    public static boolean isFloatDatatype(String datatype) {
        return (
            XSD.DECIMAL.equals(datatype) ||
            XSD.FLOAT.equals(datatype) ||
            XSD.DOUBLE.equals(datatype)
        );
    }
}
