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

package org.researchspace.repository.sparql.virtuoso;

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

    public static final String REPOSITORY_TYPE = "researchspace:VirtuosoWrapperRepository";

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new VirtuosoWrapperRepositoryConfig();
    }

    @Override
    public VirtuosoWrapperRepository getRepository(RepositoryImplConfig config) throws RepositoryConfigException {
        if (config instanceof VirtuosoWrapperRepositoryConfig) {
            VirtuosoWrapperRepositoryConfig wrapperConfig = (VirtuosoWrapperRepositoryConfig) config;
            return new VirtuosoWrapperRepository(wrapperConfig.getDelegateRepositoryId());
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
    }

}
