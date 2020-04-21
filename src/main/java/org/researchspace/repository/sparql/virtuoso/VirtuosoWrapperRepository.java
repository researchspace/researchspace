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

import java.io.File;

import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.base.RepositoryWrapper;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler;

import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * A wrapper repository to be used over a remote Virtuoso SPARQL endpoint.
 * Features:
 * <ul>
 * <li>Supports ASK queries (not allowed in Virtuoso) by transforming them into
 * equivalent SELECT ones.</li>
 * <li>Re-writes keyword search clauses according to the Virtuoso syntax (see
 * {@link VirtuosoKeywordSearchHandler}).</li>
 * </ul>
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperRepository extends RepositoryWrapper {

    protected final String repositoryId;

    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;

    /**
     * Creates an instance of the repository taking the ID of the delegate
     * repository as a parameter.
     * 
     * @param repositoryId ID of the delegate repository in Repository
     */
    public VirtuosoWrapperRepository(String repositoryId) {
        super();
        this.repositoryId = repositoryId;
        this.setDelegate(null);
    }

    @Override
    public RepositoryConnection getConnection() throws RepositoryException {
        if (this.getDelegate() == null) {
            this.setDelegate(repositoryManagerProvider.get().getRepository(this.repositoryId));
        }
        if (!isInitialized()) {
            throw new RepositoryException("SPARQLRepository not initialized.");
        }
        return new VirtuosoWrapperRepositoryConnection(this, getDelegate().getConnection());
    }

    @Override
    public void setDataDir(File dataDir) {

    }

    @Override
    public void initialize() {

    }

}
