/*
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package com.metaphacts.api.dto.querytemplate;


import org.eclipse.rdf4j.model.IRI;

import com.metaphacts.api.dto.base.DTOBase;
import com.metaphacts.vocabulary.SPL;
import com.metaphacts.vocabulary.SPL_EXT;

/**
 * POJO representation of {@link SPL#ARGUMENT_CLASS}
 * @author jt
 *
 */
public class QueryArgument extends DTOBase {
    private static final long serialVersionUID = 274319120337754602L;
    
    /**
     * Default constructor
     * @param id
     * @param label
     * @param description
     */
    public QueryArgument(IRI id, String label, String description, String predicate, IRI valueType) {
        super(id, label, description);
        
        setPredicate(predicate);
        setValueType(valueType);
    }
    
    /**
     * holds {@link SPL#PREDICATE_PROPERTY}
     */
    private String predicate;
    /**
     * holds {@link SPL#VALUETYPE_PROPERTY}, usually any of the xsd:Datatype or rdfs:Resource
     */
    private IRI valueType;
    
    /**
     * holds {@link SPL_EXT#VALUETYPE_PROPERTY}
     */
    private boolean required = true;
    
    public String getPredicate() {
        return predicate;
    }

    public void setPredicate(String predicate) {
        if(predicate==null || predicate.isEmpty())
            throw new IllegalArgumentException("A QueryArgument must have a predicate.");
        this.predicate = predicate;
    }

    public IRI getValueType() {
        return valueType;
    }

    public void setValueType(IRI valueType) {
        if(valueType==null)
            throw new IllegalArgumentException("A QueryArgument must have a valueType.");
        this.valueType = valueType;
    }
    

    /**
     * @return true by default 
     */
    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

}