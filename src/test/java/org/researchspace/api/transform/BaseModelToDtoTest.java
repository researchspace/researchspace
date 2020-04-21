/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.transform;

import java.io.IOException;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;

public class BaseModelToDtoTest {
    protected ValueFactory vf = SimpleValueFactory.getInstance();
    protected static String FILE_SPIN_QUERY_TTL = "/org/researchspace/api/transform/spQuery.ttl";
    protected static String FILE_SPIN_TEMPLATE_TTL = "/org/researchspace/api/transform/spTemplate.ttl";
    protected static String FILE_QUERY_FORM_TTL = "/org/researchspace/api/transform/queryForm.ttl";

    protected Model readTurtleInputStreamIntoModel(String fileInClasspath, IRI baseIRI, Resource... contexts)
            throws RDFParseException, UnsupportedRDFormatException, IOException {
        return Rio.parse(this.getClass().getResourceAsStream(fileInClasspath), baseIRI.stringValue(), RDFFormat.TURTLE,
                contexts);
    }
}