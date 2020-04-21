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

package org.researchspace.repository;

import org.eclipse.rdf4j.repository.Repository;

/**
 * A provider class that retrieves the repository reference on demand from the
 * {@link RepositoryManager}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpRepositoryProvider {

    private final RepositoryManager repositoryManager;
    private final String repositoryId;

    public MpRepositoryProvider(RepositoryManager repositoryManager, String repositoryId) {
        if (repositoryId == null) {
            throw new IllegalArgumentException("repositoryId cannot be null");
        }
        this.repositoryManager = repositoryManager;
        this.repositoryId = repositoryId;
    }

    public RepositoryManager getRepositoryManager() {
        return repositoryManager;
    }

    public String getRepositoryId() {
        return repositoryId;
    }

    public Repository getRepository() {
        return repositoryManager.getRepository(repositoryId);
    }

    @Override
    public int hashCode() {
        return repositoryId.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return (obj instanceof MpRepositoryProvider)
                ? this.repositoryId.equals(((MpRepositoryProvider) obj).getRepositoryId())
                : false;
    }

}
