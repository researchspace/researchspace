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

package org.researchspace.sail.rest.geonames;

import java.io.InputStream;
import java.util.Collection;
import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractRESTWrappingSailConnection;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class GeonamesSailConnection extends AbstractRESTWrappingSailConnection {

    public GeonamesSailConnection(AbstractServiceWrappingSail sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {
        return null;
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {
        return null;
    }
    
}
