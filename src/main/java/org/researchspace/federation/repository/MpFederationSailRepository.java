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

package org.researchspace.federation.repository;

import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.sail.SailException;

/**
 * A custom extension of the generic {@link SailRepository} able to process
 * queries with custom aggregation functions (see
 * {@link MpFederationSailRepositoryConnection}).
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationSailRepository extends SailRepository {

    public MpFederationSailRepository(MpFederation sail) {
        super(sail);
    }

    @Override
    public SailRepositoryConnection getConnection() throws RepositoryException {
        try {
            return new MpFederationSailRepositoryConnection(this, ((MpFederation) getSail()).getConnection());
        } catch (SailException e) {
            throw new RepositoryException(e);
        }
    }

}