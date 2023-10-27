/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.repository.sparql;

import org.eclipse.rdf4j.http.client.SPARQLProtocolSession;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.SPARQLConnection;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;

/**
 * Override of the default rdf4j {@link SPARQLConnection}.
 */
public class CustomSPARQLConnection extends SPARQLConnection {

    public CustomSPARQLConnection(SPARQLRepository repository, SPARQLProtocolSession client, boolean quadMode) {
        super(repository, client, quadMode);
    }

    public CustomSPARQLConnection(SPARQLRepository repository, SPARQLProtocolSession client) {
        super(repository, client);
    }

    @Override
    public void commit() throws RepositoryException {
        // all write operations are going through commit method
        // so it is a good place to enforce readonly status of the repository.
        if (this.getRepository().isWritable()) {
            super.commit();
        } else {
            throw new RepositoryException(
                    "Can't commit transaction. " + this.getRepository().toString() + " repository is readonly!");
        }
    }
}
