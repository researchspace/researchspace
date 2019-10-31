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

package com.metaphacts.repository.sparql;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;

import com.metaphacts.repository.MpRepositoryVocabulary;

/**
 * Repository config to configure various parameters of the SPARQL repository
 * that are not available in {@link SPARQLRepositoryConfig}
 * (e.g., enabling quad mode).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpSPARQLRepositoryConfig extends SPARQLRepositoryConfig {
    
    protected static final ValueFactory vf = SimpleValueFactory.getInstance();
    
    private boolean usingQuads = true;

    public MpSPARQLRepositoryConfig() {
        super();
        setType(DefaultMpSPARQLRepositoryFactory.REPOSITORY_TYPE);
    }

    public MpSPARQLRepositoryConfig(String queryEndpointUrl) {
        this();
        setQueryEndpointUrl(queryEndpointUrl);
    }

    public MpSPARQLRepositoryConfig(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }
    
    public boolean isUsingQuads() {
        return usingQuads;
    }

    public void setUsingQuads(boolean usingQuads) {
        this.usingQuads = usingQuads;
    }
    
    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        model.add(implNode, MpRepositoryVocabulary.QUAD_MODE, vf.createLiteral(usingQuads));
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws RepositoryConfigException {
        super.parse(model, implNode);
        
        try {
            Models.objectLiteral(model.filter(
                    implNode, MpRepositoryVocabulary.QUAD_MODE, null)).ifPresent(
                        lit -> setUsingQuads(lit.booleanValue()));
        } catch (ModelException e) {
            throw new SailConfigException(e.getMessage(), e);
        }
    }
    
    

}