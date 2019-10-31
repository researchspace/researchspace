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
 * The platform's quality assurance vocabulary (extending SHACL to support data quality checks)
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MPQA {

    public static final String NAMESPACE = "http://www.metaphacts.com/ontologies/qa#";
    
    public static final IRI hasSPINQueryTemplate;
    public static final IRI parameter;
    public static final IRI createdFromPattern;
    public static final IRI createdByGenerator;
    public static final IRI shapeType;
    public static final IRI generatorQuery;
    public static final IRI basedOnPattern;
    public static final IRI ShaclGenerator;
    
    static {
        ValueFactory VF = SimpleValueFactory.getInstance();
        
        hasSPINQueryTemplate = VF.createIRI(NAMESPACE, "hasSPINQueryTemplate");
        parameter = VF.createIRI(NAMESPACE, "parameter");
        shapeType = VF.createIRI(NAMESPACE, "shapeType");
        generatorQuery = VF.createIRI(NAMESPACE, "generatorQuery");
        basedOnPattern = VF.createIRI(NAMESPACE, "basedOnPattern");
        createdFromPattern = VF.createIRI(NAMESPACE, "createdFromPattern");
        createdByGenerator = VF.createIRI(NAMESPACE, "createdByGenerator");
        
        ShaclGenerator = VF.createIRI(NAMESPACE, "ShaclGenerator");
    }
    
    private MPQA() {
        
    }

}
