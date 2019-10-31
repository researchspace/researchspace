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

import java.util.Optional;

import org.apache.commons.lang.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.vocabulary.FN;

/**
 * Some functions that are declared as built-in in the 
 * SPARQL 1.1 specification are also identifiable as 
 * URI functions in the fn: namespace. 
 * RDF4J immediately converts them into the URI representation when parsing.
 * This leads to failures, however, with some triple stores (like Blazegraph)
 * that do not understand the URI representation of built-ins and try to process 
 * them as custom URI functions.  
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public enum FNFunction {
    CONCAT("CONCAT", FN.CONCAT),
    CONTAINS("CONTAINS", FN.CONTAINS),
    DAY("DAY", FN.DAY_FROM_DATETIME), 
    ENCODE_FOR_URI("ENCODE_FOR_URI", FN.ENCODE_FOR_URI),
    STRENDS("STRENDS", FN.ENDS_WITH),
    HOURS("HOURS", FN.HOURS_FROM_DATETIME),
    LCASE("LCASE", FN.LOWER_CASE),
    MINUTES("MINUTES", FN.MINUTES_FROM_DATETIME),
    MONTH("MONTH", FN.MONTH_FROM_DATETIME),
    ABS("ABS", FN.NUMERIC_ABS),
    CEIL("CEIL", FN.NUMERIC_CEIL),
    FLOOR("FLOOR", FN.NUMERIC_FLOOR),
    ROUND("ROUND", FN.NUMERIC_ROUND),
    REPLACE("REPLACE", FN.REPLACE),
    SECONDS("SECONDS", FN.SECONDS_FROM_DATETIME),
    STRSTARTS("STRSTARTS", FN.STARTS_WITH),
    STRLEN("STRLEN", FN.STRING_LENGTH),
    SUBSTR("SUBSTR", FN.SUBSTRING),
    STRBEFORE("STRBEFORE", FN.SUBSTRING_BEFORE),
    STRAFTER("STRAFTER", FN.SUBSTRING_AFTER),
    TIMEZONE("TIMEZONE", FN.TIMEZONE_FROM_DATETIME),
    UCASE("UCASE", FN.UPPER_CASE),
    YEAR("YEAR", FN.YEAR_FROM_DATETIME);
    
    private final String name;
    private final IRI uri;
    
    private FNFunction(String name, IRI uri) {
        this.name = name;
        this.uri = uri;
    }
    
    public static Optional<FNFunction> byName(String name) {
        if (StringUtils.isEmpty(name)) {
            return Optional.empty();
        }
        for (FNFunction item : FNFunction.values()) {
            if (item.name.equals(name)) {
                return Optional.of(item);
            }
        }
        return Optional.empty();
    }
    
    public static Optional<FNFunction> byUri(IRI uri) {
        if (uri == null) {
            return Optional.empty();
        }
        for (FNFunction item : FNFunction.values()) {
            if (item.uri.equals(uri)) {
                return Optional.of(item);
            }
        }
        return Optional.empty();
    }
    
    public static Optional<FNFunction> byUri(String uriAsString) {
        if (StringUtils.isEmpty(uriAsString)) {
            return Optional.empty();
        }
        for (FNFunction item : FNFunction.values()) {
            if (item.uri.stringValue().equals(uriAsString)) {
                return Optional.of(item);
            }
        }
        return Optional.empty();
    }

    public String getName() {
        return name;
    }

    public IRI getUri() {
        return uri;
    }
    
    
}