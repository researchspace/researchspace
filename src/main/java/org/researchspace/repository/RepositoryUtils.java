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

import java.io.File;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.event.NotifyingRepository;
import org.eclipse.rdf4j.repository.event.NotifyingRepositoryConnection;
import org.eclipse.rdf4j.repository.event.RepositoryConnectionListener;
import org.eclipse.rdf4j.repository.event.RepositoryListener;
import org.eclipse.rdf4j.repository.event.base.NotifyingRepositoryWrapper;
import org.researchspace.cache.CacheManager;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class RepositoryUtils {

    @SuppressWarnings("unused")
    private void wrapDefaultAsNotifyingRepository(Repository defaultRepository, CacheManager cacheManager) {
        // wrap into NotifyingRepository without reporting deltas
        final Repository wrappedRepository = new NotifyingRepositoryWrapper(defaultRepository, false);
        ((NotifyingRepositoryWrapper) wrappedRepository).addRepositoryListener(new RepositoryListener() {

            @Override
            public void getConnection(NotifyingRepository repo, NotifyingRepositoryConnection conn) {
                // TODO we may hook in here for namespace service
                conn.addRepositoryConnectionListener(new RepositoryConnectionListener() {

                    @Override
                    public void setNamespace(RepositoryConnection conn, String prefix, String name) {
                    }

                    @Override
                    public void setAutoCommit(RepositoryConnection conn, boolean autoCommit) {
                    }

                    @Override
                    public void rollback(RepositoryConnection conn) {
                    }

                    @Override
                    public void removeNamespace(RepositoryConnection conn, String prefix) {
                    }

                    @Override
                    public void remove(RepositoryConnection conn, Resource subject, IRI predicate, Value object,
                            Resource... contexts) {
                    }

                    @Override
                    public void execute(RepositoryConnection conn, QueryLanguage ql, String update, String baseURI,
                            Update operation) {
                        cacheManager.invalidateAll();
                    }

                    @Override
                    public void commit(RepositoryConnection conn) {
                        cacheManager.invalidateAll();
                    }

                    @Override
                    public void close(RepositoryConnection conn) {

                    }

                    @Override
                    public void clearNamespaces(RepositoryConnection conn) {

                    }

                    @Override
                    public void clear(RepositoryConnection conn, Resource... contexts) {

                    }

                    @Override
                    public void begin(RepositoryConnection conn) {

                    }

                    @Override
                    public void add(RepositoryConnection conn, Resource subject, IRI predicate, Value object,
                            Resource... contexts) {

                    }
                });
            }

            @Override
            public void initialize(NotifyingRepository repo) {

            }

            @Override
            public void setDataDir(NotifyingRepository repo, File dataDir) {

            }

            @Override
            public void shutDown(NotifyingRepository repo) {
                // TODO Auto-generated method stub

            }

        });
    }
}