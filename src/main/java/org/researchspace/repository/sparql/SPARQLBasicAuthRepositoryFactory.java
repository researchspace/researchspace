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

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SPARQLBasicAuthRepositoryFactory extends AbstractMpSPARQLRepositoryFactory {

    public static final String REPOSITORY_TYPE = "researchspace:SPARQLBasicAuthRepository";

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new SPARQLBasicAuthRepositoryConfig();
    }

    @Override
    protected SPARQLAuthenticatingRepository getRepositoryInternal(MpSPARQLRepositoryConfig config)
            throws RepositoryConfigException {
        SPARQLAuthenticatingRepository result = null;

        if (config instanceof SPARQLBasicAuthRepositoryConfig) {
            SPARQLBasicAuthRepositoryConfig httpConfig = (SPARQLBasicAuthRepositoryConfig) config;
            if (httpConfig.getUpdateEndpointUrl() != null) {
                result = new SPARQLAuthenticatingRepository(httpConfig.getQueryEndpointUrl(),
                        httpConfig.getUpdateEndpointUrl());
            } else {
                result = new SPARQLAuthenticatingRepository(httpConfig.getQueryEndpointUrl());
            }
            result.setBasicAuthCredentials(httpConfig.getUsername(), httpConfig.getPassword());
            result.setWritable(httpConfig.isWritable());
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
        return result;
    }

}
