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

package com.metaphacts.sail.virtuoso;

import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSail;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler;

/**
 * A {@link Sail} implementation to process the keyword search clauses aimed 
 * at some Virtuoso backend repository.
 *
 * <p>The keyword search clause can be expressed as
 *  <pre><code>
 *  ?instance rdfs:label ?label .
 *  ?label bif:contains ?token .
 *  ?label bif:score ?score .
 *  </code><pre>
 *  which would be translated into the Virtuoso-specific format 
 *  (see {@link VirtuosoKeywordSearchHandler}).
 *  </p>
 *  
 *  <p>
 *  <b>Deprecated.</b> 
 *  {@link com.metaphacts.repository.sparql.virtuoso.VirtuosoWrapperRepository}
 *  should be used instead.
 *  </p>
 *  
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
@Deprecated
public class VirtuosoKeywordSearchSail extends AbstractSail {
    
    private final String repositoryId;
    private Repository virtuosoRepository = null;
    
    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;

    public VirtuosoKeywordSearchSail(String repositoryId) {
        this.repositoryId = repositoryId;
    }

    @Override
    public boolean isWritable() throws SailException {
        return false;
    }
    
    @Override
    public ValueFactory getValueFactory() {
        return virtuosoRepository.getValueFactory();
    }

    @Override
    protected synchronized SailConnection getConnectionInternal() throws SailException {
        if (this.virtuosoRepository == null) {
            this.virtuosoRepository = repositoryManagerProvider
                                        .get().getRepository(this.repositoryId);
        }
        return new VirtuosoKeywordSearchSailConnection(this);
    }

    public Repository getVirtuosoRepository() {
        return virtuosoRepository;
    }

    @Override
    protected void shutDownInternal() throws SailException {
        // Do nothing
    }
}