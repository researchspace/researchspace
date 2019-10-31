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

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;

import com.metaphacts.repository.MpRepositoryVocabulary;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SPARQLDigestAuthRepositoryConfig extends
        SPARQLAuthenticatingRepositoryConfig {
    
    private String realm;
    
    public SPARQLDigestAuthRepositoryConfig() {
        super(SPARQLDigestAuthRepositoryFactory.REPOSITORY_TYPE);
    }

    public String getRealm() {
        return realm;
    }

    public void setRealm(String realm) {
        this.realm = realm;
    }
    
    @Override
    public void validate()
        throws RepositoryConfigException
    {
        super.validate();
        if(StringUtils.isEmpty(getRealm())){
            throw new RepositoryConfigException("No realm specified for SPARQL digest auth repository.");
        }

    }
    
    @Override
    public Resource export(Model m) {
        Resource implNode = super.export(m);

        if (getUsername() != null) {
            m.add(implNode, MpRepositoryVocabulary.REALM, vf.createLiteral(getRealm()));
        }

        return implNode;
    }

    @Override
    public void parse(Model m, Resource implNode)
        throws RepositoryConfigException
    {
        super.parse(m, implNode);

        try {
            Models.objectLiteral(m.filter(implNode, MpRepositoryVocabulary.REALM, null)).ifPresent(
                    iri -> setRealm(iri.stringValue()));
        }
        catch (ModelException e) {
            throw new RepositoryConfigException(e.getMessage(), e);
        }
    }
}