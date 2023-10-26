/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.repository.sparql;

import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryFactory;

/**
 * 
 * Custom factory implementation for {@link SPARQLRepository} or its subclasses.
 * 
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class DefaultMpSPARQLRepositoryFactory extends AbstractMpSPARQLRepositoryFactory {

    public static final String REPOSITORY_TYPE = "researchspace:SPARQLRepository";

    public DefaultMpSPARQLRepositoryFactory() {

    }

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new MpSPARQLRepositoryConfig();
    }

    /**
     * Copied from {@link SPARQLRepositoryFactory}.
     */
    @Override
    public SPARQLRepository getRepositoryInternal(MpSPARQLRepositoryConfig config) throws RepositoryConfigException {
        CustomSPARQLRepository result = null;

        if (config instanceof SPARQLRepositoryConfig) {
            SPARQLRepositoryConfig httpConfig = config;
            if (httpConfig.getUpdateEndpointUrl() != null) {
                result = new CustomSPARQLRepository(httpConfig.getQueryEndpointUrl(),
                        httpConfig.getUpdateEndpointUrl());
            } else {
                result = new CustomSPARQLRepository(httpConfig.getQueryEndpointUrl());
            }
            result.setWritable(config.isWritable());
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
        return result;
    }

}
