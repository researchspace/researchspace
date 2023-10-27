/**
 * ResearchSpace Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.repository.sparql;

import org.eclipse.rdf4j.http.client.SPARQLProtocolSession;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultFormat;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.rio.RDFFormat;

/**
 * Override of the default rdf4j
 * {@link org.eclipse.rdf4j.repository.sparql.SPARQLRepository}. We mainly need
 * it to enable passthrough optimization in rdf4j.
 *
 * Because of really unfortunate hardcoding in the rdf4j
 * (https://github.com/eclipse/rdf4j/blob/556c8f3bab916aa5d9951fc6a722d6d1f1a815f5/core/repository/sparql/src/main/java/org/eclipse/rdf4j/repository/sparql/SPARQLRepository.java#L141)
 * we can't do this on the level of {@link MpSPARQLProtocolSession}.
 */
public class CustomSPARQLRepository extends org.eclipse.rdf4j.repository.sparql.SPARQLRepository {
    /**
     * quadMode is defined as private in the superclass, so we store it here to make
     * the value accessible in our custom sparql connection.
     */
    private boolean quadMode;

    /**
     * true if repository supports writes
     */
    private boolean isWritable;

    public CustomSPARQLRepository(String endpointUrl) {
        super(endpointUrl);
    }

    public CustomSPARQLRepository(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }

    @Override
    public void enableQuadMode(boolean flag) {
        super.enableQuadMode(flag);
        this.quadMode = flag;
    }

    public void setWritable(boolean isWritable) {
        this.isWritable = isWritable;
    }

    @Override
    public boolean isWritable() throws RepositoryException {
        return this.isWritable;
    }

    @Override
    protected SPARQLProtocolSession createHTTPClient() {
        SPARQLProtocolSession session = super.createHTTPClient();

        // rdf4j has nice performance optimization that help to avoid unnecessary
        // serialization
        // and deserialization of query results, which is quite relevant for us because
        // very often we just send the result to the web client
        // without doing any manipulations on the server side.
        //
        // This feature works only when the result format returned from triplestore
        // matches format
        // of the supplied RDFWriter. But rdf4j (as of v3.2.0) create Accept header for
        // request query without taking into consideration
        // supplied RDFWriter, and by default just use default preferred result format.
        // (xml for select, and turtle for construct)
        // We need to change preferred format for select to JSON, because that is what
        // we use on client-side.
        //
        // As a result passthrough optimization is not going to happen if someone
        // manually requests some other format.
        // Hopefully in future versions rdf4j will take RDFWriter format into
        // consideration, we then can remove this logic.
        //
        // see https://github.com/eclipse/rdf4j/pull/1943
        session.setPreferredTupleQueryResultFormat(TupleQueryResultFormat.JSON);
        session.setPreferredRDFFormat(RDFFormat.TURTLE);
        return session;
    }

    @Override
    public RepositoryConnection getConnection() throws RepositoryException {
        if (!isInitialized()) {
            init();
        }
        return new CustomSPARQLConnection(this, createHTTPClient(), this.quadMode);
    }
}
