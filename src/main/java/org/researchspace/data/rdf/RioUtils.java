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

package org.researchspace.data.rdf;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.rio.ParserConfig;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;
import org.eclipse.rdf4j.rio.helpers.BasicParserSettings;
import org.eclipse.rdf4j.rio.helpers.BasicWriterSettings;
import org.eclipse.rdf4j.rio.helpers.ParseErrorLogger;
import org.researchspace.config.NamespaceRegistry;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
public class RioUtils {

    @Inject
    private NamespaceRegistry ns;

    /**
     * Namespaces aware RIO parser.
     */
    public Model parse(InputStream io, String baseURI, RDFFormat dataFormat, Resource... contexts)
            throws RDFParseException, UnsupportedRDFormatException, IOException {
        ParserConfig config = new ParserConfig();
        config.set(BasicParserSettings.NAMESPACES, ns.getRioNamespaces());
        return Rio.parse(io, baseURI, dataFormat, config, SimpleValueFactory.getInstance(), new ParseErrorLogger(),
                contexts);
    }

    /**
     * Basic RIO writer
     */
    public void write(RDFFormat format, Model model, OutputStream out) {
        RDFWriter writer = Rio.createWriter(format, out);
        writer.startRDF();

        ns.getRioNamespaces().stream()
                .forEach(namespace -> writer.handleNamespace(namespace.getPrefix(), namespace.getName()));
        writer.set(BasicWriterSettings.PRETTY_PRINT, true);

        for (final Statement st : model) {
            writer.handleStatement(st);
        }
        writer.endRDF();
    }
}
