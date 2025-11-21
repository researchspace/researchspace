/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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
package org.researchspace.sail.rest.tna;

import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.RESTSail;
import org.researchspace.sail.rest.RESTSailConfig;

public class TnaDiscoveryApiRangeSearchSail extends RESTSail {
    public TnaDiscoveryApiRangeSearchSail(RESTSailConfig config) {
        super(config);
    }

    @Override
    protected TnaDiscoveryApiRangeSearchSailConnection getConnectionInternal() throws SailException {
        return new TnaDiscoveryApiRangeSearchSailConnection(this);
    }
}
