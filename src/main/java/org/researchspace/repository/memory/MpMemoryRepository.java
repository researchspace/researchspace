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

import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.base.RepositoryWrapper;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.memory.MemoryStore;

/**
 * Placeholder repository activated if no default repository is specified via a
 * Turtle repository configuration or environment.prop.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpMemoryRepository extends RepositoryWrapper {

    public MpMemoryRepository() {
        super(new SailRepository(new MemoryStore()));
    }

    @Override
    public RepositoryConnection getConnection() throws RepositoryException {
        return new MpMemoryRepositoryConnection(getDelegate(), getDelegate().getConnection());
    }

}
