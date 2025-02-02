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

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Values;
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

    public void skolemizedWrite(Model model, OutputStream out, RDFFormat format) {
        // Create a new Model to hold skolemized data
        Model skolemizedModel = new LinkedHashModel();
        String baseIRI = "http://www.researchspace.org/bnode/";

        for (Statement st: model) {
            Resource subj = st.getSubject();
            IRI pred = st.getPredicate();
            Value obj = st.getObject();

            if (subj.isBNode()) {
                // Convert blank node to IRI
                subj = toIRI((BNode) subj, baseIRI);
            }

            if (obj instanceof BNode) {
                obj = toIRI((BNode) obj, baseIRI);
            }

            skolemizedModel.add(subj, pred, obj, st.getContext());
        }


        RDFWriter writer = Rio.createWriter(format, out);
        writer.startRDF();

        ns.getRioNamespaces().stream()
                .forEach(namespace -> writer.handleNamespace(namespace.getPrefix(), namespace.getName()));
        writer.set(BasicWriterSettings.PRETTY_PRINT, true);

        for (final Statement st : skolemizedModel) {
            writer.handleStatement(st);
        }
        writer.endRDF();
    }

    private IRI toIRI(BNode bnode, String baseIRI) {
        // Use the bnode ID to craft a stable URI
        return Values.iri(baseIRI + bnode.getID());
    }   
}
