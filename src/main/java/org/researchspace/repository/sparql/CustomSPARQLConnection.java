/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.SPARQLConnection;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Override of the default rdf4j {@link SPARQLConnection}.
 * 
 * <p>Provides central TRACE-level logging of all outgoing SPARQL queries.
 * Enable with log4j-trace profile or by setting TRACE on
 * {@code org.researchspace.repository.sparql.CustomSPARQLConnection}.</p>
 */
public class CustomSPARQLConnection extends SPARQLConnection {

    private static final Logger log = LoggerFactory.getLogger(CustomSPARQLConnection.class);

    public CustomSPARQLConnection(SPARQLRepository repository, SPARQLProtocolSession client, boolean quadMode,
            boolean isSilentMode) {
        super(repository, client, quadMode);
        this.enableSilentMode(isSilentMode);
    }

    public CustomSPARQLConnection(SPARQLRepository repository, SPARQLProtocolSession client, boolean quadMode) {
        super(repository, client, quadMode);
    }


    public CustomSPARQLConnection(SPARQLRepository repository, SPARQLProtocolSession client) {
        super(repository, client);
    }

    @Override
    public TupleQuery prepareTupleQuery(QueryLanguage ql, String query, String base)
            throws MalformedQueryException, RepositoryException {
        if (log.isTraceEnabled()) {
            log.trace("Outgoing SPARQL SELECT to [{}]: {}", getRepository().toString(), query);
        }
        return super.prepareTupleQuery(ql, query, base);
    }

    @Override
    public BooleanQuery prepareBooleanQuery(QueryLanguage ql, String query, String base)
            throws MalformedQueryException, RepositoryException {
        if (log.isTraceEnabled()) {
            log.trace("Outgoing SPARQL ASK to [{}]: {}", getRepository().toString(), query);
        }
        return super.prepareBooleanQuery(ql, query, base);
    }

    @Override
    public GraphQuery prepareGraphQuery(QueryLanguage ql, String query, String base)
            throws MalformedQueryException, RepositoryException {
        if (log.isTraceEnabled()) {
            log.trace("Outgoing SPARQL CONSTRUCT to [{}]: {}", getRepository().toString(), query);
        }
        return super.prepareGraphQuery(ql, query, base);
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

