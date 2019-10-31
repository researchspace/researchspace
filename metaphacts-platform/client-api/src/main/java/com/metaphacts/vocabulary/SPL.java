/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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