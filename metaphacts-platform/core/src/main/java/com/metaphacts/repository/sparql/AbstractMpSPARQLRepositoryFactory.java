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

import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public abstract class AbstractMpSPARQLRepositoryFactory implements RepositoryFactory {
    
    public AbstractMpSPARQLRepositoryFactory() {
        
    }

    protected Repository processSPARQLRepositorySettings(SPARQLRepository repository, MpSPARQLRepositoryConfig config) {
        repository.enableQuadMode(config.isUsingQuads());
        return repository;
    }
    
    protected abstract SPARQLRepository getRepositoryInternal(MpSPARQLRepositoryConfig config) throws RepositoryConfigException;
    
    @Override
    public Repository getRepository(RepositoryImplConfig config) throws RepositoryConfigException {
        if (config instanceof MpSPARQLRepositoryConfig) {
            SPARQLRepository repository = getRepositoryInternal((MpSPARQLRepositoryConfig)config);
            return processSPARQLRepositorySettings(repository, (MpSPARQLRepositoryConfig)config);
        } else {
            throw new RepositoryConfigException("Invalid configuration class: "
                    + config.getClass());
        }
    }

}