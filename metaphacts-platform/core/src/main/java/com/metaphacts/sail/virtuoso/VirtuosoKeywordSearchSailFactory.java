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

package com.metaphacts.sail.virtuoso;

import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.Singleton;
import com.metaphacts.repository.RepositoryManager;


/**
 * {@link SailFactory} implementation to create {@link VirtuosoKeywordSearchSail} instances.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
@Singleton
@Deprecated
public class VirtuosoKeywordSearchSailFactory implements SailFactory {
    
    public static final String SAIL_TYPE = "metaphacts:VirtuosoKeywordSail";
    
    @Inject static Provider<RepositoryManager> repositoryManagerProvider;
        
    public VirtuosoKeywordSearchSailFactory() {
        
    }

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new VirtuosoKeywordSearchSailImplConfig();
    }

    @Override
    public VirtuosoKeywordSearchSail getSail(SailImplConfig config) throws SailConfigException {
        if (!(config instanceof VirtuosoKeywordSearchSailImplConfig)) {
            throw new SailConfigException(
                    "Wrong config type: " 
                            + config.getClass().getCanonicalName() + ". ");
        }
        VirtuosoKeywordSearchSail res = new VirtuosoKeywordSearchSail(
                ((VirtuosoKeywordSearchSailImplConfig)config).getDelegateRepositoryId());
        return res;
    }

}