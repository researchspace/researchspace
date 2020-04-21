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

package org.researchspace.sail.virtuoso;

import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSail;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.sparql.keyword.virtuoso.VirtuosoKeywordSearchHandler;

import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * A {@link Sail} implementation to process the keyword search clauses aimed at
 * some Virtuoso backend repository.
 *
 * <p>
 * The keyword search clause can be expressed as
 * 
 * <pre>
 * <code>
 *  ?instance rdfs:label ?label .
 *  ?label bif:contains ?token .
 *  ?label bif:score ?score .
 *  </code>
 * 
 * <pre>
 * which would be translated into the Virtuoso-specific format (see
 * {@link VirtuosoKeywordSearchHandler}).
 * </p>
 * 
 * <p>
 * <b>Deprecated.</b>
 * {@link org.researchspace.repository.sparql.virtuoso.VirtuosoWrapperRepository}
 * should be used instead.
 * </p>
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
            this.virtuosoRepository = repositoryManagerProvider.get().getRepository(this.repositoryId);
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