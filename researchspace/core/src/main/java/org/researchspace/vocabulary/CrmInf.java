/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class CrmInf {

    public static String NAMESPACE = "http://www.ics.forth.gr/isl/CRMinf/";

    public static final IRI I1_Argumentation;
    public static final IRI I4_Proposition_Set;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        I1_Argumentation = f.createIRI(NAMESPACE, "I1_Argumentation");  
        I4_Proposition_Set = f.createIRI(NAMESPACE, "I4_Proposition_Set");  
    }

}
