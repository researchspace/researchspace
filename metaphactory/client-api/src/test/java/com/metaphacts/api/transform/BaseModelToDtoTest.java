/*
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package com.metaphacts.api.transform;

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
    protected static String FILE_SPIN_QUERY_TTL="/com/metaphacts/api/transform/spQuery.ttl";
    protected static String FILE_SPIN_TEMPLATE_TTL="/com/metaphacts/api/transform/spTemplate.ttl";
    protected static String FILE_QUERY_FORM_TTL="/com/metaphacts/api/transform/queryForm.ttl";

    protected Model readTurtleInputStreamIntoModel(String fileInClasspath, IRI baseIRI,Resource... contexts) throws RDFParseException, UnsupportedRDFormatException, IOException{
        return Rio.parse(this.getClass().getResourceAsStream(fileInClasspath), baseIRI.stringValue(), RDFFormat.TURTLE, contexts);
    }
}