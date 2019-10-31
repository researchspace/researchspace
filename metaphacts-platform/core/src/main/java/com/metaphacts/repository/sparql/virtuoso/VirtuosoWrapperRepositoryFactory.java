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

import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;

/**
 * A {@link RepositoryFactory} implementation for a Virtuoso repository.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperRepositoryFactory implements RepositoryFactory {

    public static final String REPOSITORY_TYPE = "metaphacts:VirtuosoWrapperRepository";

    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    public RepositoryImplConfig getConfig() {
        return new VirtuosoWrapperRepositoryConfig();
    }

    public VirtuosoWrapperRepository getRepository(RepositoryImplConfig config)
        throws RepositoryConfigException
    {
        if (config instanceof VirtuosoWrapperRepositoryConfig) {
            VirtuosoWrapperRepositoryConfig wrapperConfig = (VirtuosoWrapperRepositoryConfig)config;
            return new VirtuosoWrapperRepository(wrapperConfig.getDelegateRepositoryId());
        }
        else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
    }

}
