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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author ArtemKozlov <ak@metaphacts.com>
 */
public class PLATFORM {
    
    public static String NAMESPACE = "http://www.metaphacts.com/ontologies/platform#";

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
