/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.repository.memory;

import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.base.RepositoryWrapper;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.memory.MemoryStore;

/**
 * Placeholder repository activated if no default repository is specified via 
 * a Turtle repository configuration or environment.prop.
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
