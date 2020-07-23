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

package org.researchspace.repository.sparql.bearertoken;

import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.researchspace.repository.sparql.AbstractMpSPARQLRepositoryFactory;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;

public class SPARQLBearerTokenAuthRepositoryFactory extends AbstractMpSPARQLRepositoryFactory {

    public static final String REPOSITORY_TYPE = "researchspace:SPARQLBearerTokenAuthRepository";

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new SPARQLBearerTokenAuthRepositoryConfig();
    }

    @Override
    protected SPARQLBearerTokenAuthRepository getRepositoryInternal(MpSPARQLRepositoryConfig config)
            throws RepositoryConfigException {
        SPARQLBearerTokenAuthRepository result = null;

        if (config instanceof SPARQLBearerTokenAuthRepositoryConfig) {
            SPARQLBearerTokenAuthRepositoryConfig httpConfig = (SPARQLBearerTokenAuthRepositoryConfig) config;
            if (httpConfig.getUpdateEndpointUrl() != null) {
                result = new SPARQLBearerTokenAuthRepository(httpConfig.getQueryEndpointUrl(),
                        httpConfig.getUpdateEndpointUrl());
            } else {
                result = new SPARQLBearerTokenAuthRepository(httpConfig.getQueryEndpointUrl());
            }
            result.setAuthenticationToken(httpConfig.getAuthenticationToken());
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
        return result;
    }

}
