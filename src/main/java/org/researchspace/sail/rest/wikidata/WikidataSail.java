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

package org.researchspace.sail.rest.wikidata;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

/**
 * {@link Sail} wrapper for the Wikidata search API
 * (https://www.wikidata.org/w/api.php).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class WikidataSail extends AbstractServiceWrappingSail<WikidataSailConfig> {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    public static final IRI HAS_WIKIDATA_SEARCH_TOKEN = VF
            .createIRI("http://www.researchspace.org/resource/system/hasWikidataSearchToken");

    public WikidataSail(WikidataSailConfig config) {
        super(config);
    }

    @Override
    protected SailConnection getConnectionInternal() throws SailException {
        return new WikidataSailConnection(this);
    }

    @Override
    protected void shutDownInternal() throws SailException {
        super.shutDownInternal();
    }

}