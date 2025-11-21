/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.repository.sparql.qlever;

import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.researchspace.repository.sparql.AbstractMpSPARQLRepositoryFactory;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;

/**
 * A {@link RepositoryFactory} implementation for a QLever repository.
 * 
 * @author Artem Kozlov
 */
public class QLeverRepositoryFactory extends AbstractMpSPARQLRepositoryFactory {

    public static final String REPOSITORY_TYPE = "researchspace:QLeverRepository";

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new QLeverRepositoryConfig();
    }

    @Override
    public QLeverRepository getRepositoryInternal(MpSPARQLRepositoryConfig config) throws RepositoryConfigException {
        if (config instanceof SPARQLRepositoryConfig) {
            SPARQLRepositoryConfig httpConfig = config;
            QLeverRepository result = new QLeverRepository(httpConfig.getQueryEndpointUrl());
            result.setWritable(config.isWritable());
            return result;
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
    }
}
