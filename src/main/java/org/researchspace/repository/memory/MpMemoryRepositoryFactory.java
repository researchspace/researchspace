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

package org.researchspace.repository.memory;

import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;

public class MpMemoryRepositoryFactory implements RepositoryFactory {

    public static final String REPOSITORY_TYPE = "researchspace:DefaultMemoryRepository";

    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new MpMemoryRepositoryImplConfig();
    }

    @Override
    public Repository getRepository(RepositoryImplConfig config) throws RepositoryConfigException {
        Repository result;
        if (config instanceof MpMemoryRepositoryImplConfig) {
            result = new MpMemoryRepository();
        } else {
            throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
        }
        return result;
    }

}
