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

package com.metaphacts.repository.sparql.virtuoso;

import java.util.Collection;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.AbstractRepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.sail.config.SailConfigException;

import com.google.common.base.Strings;
import com.google.common.collect.Lists;
import com.metaphacts.repository.MpDelegatingImplConfig;
import com.metaphacts.repository.MpRepositoryVocabulary;

/**
 * Implementation config for {@link VirtuosoWrapperRepository}. 
 * The only passed parameter is the ID of the delegate repository 
 * in the {@link com.metaphacts.repository.RepositoryManager}.
 * The delegate repository has to be a Virtuoso SPARQL repository. 
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperRepositoryConfig extends AbstractRepositoryImplConfig
        implements MpDelegatingImplConfig {

    protected String delegateRepositoryId;

    public VirtuosoWrapperRepositoryConfig() {
        super(VirtuosoWrapperRepositoryFactory.REPOSITORY_TYPE);
    }

    @Override
    public void validate() throws RepositoryConfigException {
        super.validate();
        if (Strings.isNullOrEmpty(delegateRepositoryId)) {
            throw new RepositoryConfigException("No delegate repository ID is specified.");
        }
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        if (delegateRepositoryId != null) {
            model.add(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID,
                    SimpleValueFactory.getInstance().createLiteral(delegateRepositoryId));
        }
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);
        try {
            Models.objectLiteral(
                    model.filter(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID, null))
                    .ifPresent(lit -> setDelegateRepositoryId(lit.stringValue()));
        } catch (ModelException e) {
            throw new SailConfigException(e.getMessage(), e);
        }

    }

    public String getDelegateRepositoryId() {
        return delegateRepositoryId;
    }

    public void setDelegateRepositoryId(String delegateRepositoryId) {
        this.delegateRepositoryId = delegateRepositoryId;
    }

    @Override
    public Collection<String> getDelegateRepositoryIDs() {
        return Lists.newArrayList(this.delegateRepositoryId);
    }
}
