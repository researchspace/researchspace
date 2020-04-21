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

package org.researchspace.junit;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Enumeration;
import java.util.List;
import java.util.Vector;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class TestUtils {

    public static InputStream readPlainTextTurtleInput(String classpath) throws FileNotFoundException {
        return TestUtils.class.getResourceAsStream(classpath);
    }

    public static Model readTurtleInputStreamIntoModel(InputStream in, IRI baseIRI, Resource... contexts)
            throws RDFParseException, UnsupportedRDFormatException, IOException {
        return Rio.parse(in, baseIRI.stringValue(), RDFFormat.TURTLE, contexts);
    }

    static public Answer<Enumeration<String>> getMimetypeAnswer(final List<String> listOfMimeTypes) {
        return new Answer<Enumeration<String>>() {
            @Override
            public Enumeration<String> answer(InvocationOnMock invocation) throws Throwable {
                return new Vector<String>(listOfMimeTypes).elements();
            }
        };
    }
}