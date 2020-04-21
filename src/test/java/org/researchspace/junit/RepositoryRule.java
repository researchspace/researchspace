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

package org.researchspace.junit;

import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.junit.rules.TemporaryFolder;
import org.researchspace.data.rdf.ReadConnection;
import org.researchspace.repository.RepositoryManager;

import com.google.common.base.Throwables;
import com.google.inject.Inject;
import com.google.inject.Singleton;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@Singleton
public class RepositoryRule extends TemporaryFolder {
    private SailRepository repository;
    private SailRepository assetRepository;
    private SailRepository testRepository;
    private ReadConnection read;

    private static final Logger logger = LogManager.getLogger(RepositoryRule.class);

    @Inject
    private RepositoryManager repositoryManager;

    @Override
    protected void before() throws Throwable {
        super.before();

        try {
            repository = new SailRepository(new MemoryStore());
            if (!repository.isInitialized())
                repository.initialize();
            try (RepositoryConnection conn = repository.getConnection();) {
            }

            assetRepository = new SailRepository(new MemoryStore());
            if (!assetRepository.isInitialized()) {
                assetRepository.initialize();
            }
            try (RepositoryConnection conn = assetRepository.getConnection();) {
            }

            testRepository = new SailRepository(new MemoryStore());
            if (!testRepository.isInitialized()) {
                testRepository.initialize();
            }
            try (RepositoryConnection conn = testRepository.getConnection();) {
            }

            repositoryManager.setForTests(repository, assetRepository, testRepository);

            this.read = new ReadConnection(repository);
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
    }

    @Override
    protected void after() {
        super.after();
        this.repository.shutDown();
        this.assetRepository.shutDown();
        this.testRepository.shutDown();
        Set<String> ids = this.repositoryManager.getInitializedRepositoryIds();
        for (String id : ids) {
            try {
                Repository repo = this.repositoryManager.getRepository(id);
                if (repo.isInitialized()) {
                    repo.shutDown();
                }
            } catch (Exception e) {
                // Could not shut down properly
            }
        }
    }

    public Repository getRepository() {
        return this.repository;
    }

    public Repository getAssetRepository() {
        return this.assetRepository;
    }

    public Repository getTestRepository() {
        return this.testRepository;
    }

    public RepositoryManager getRepositoryManager() {
        return this.repositoryManager;
    }

    public ReadConnection getReadConnection() {
        return this.read;
    }

}
