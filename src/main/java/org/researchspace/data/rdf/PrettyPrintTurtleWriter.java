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

package org.researchspace.data.rdf;

import java.io.IOException;
import java.io.OutputStream;
import java.io.Writer;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.rdf4j.common.net.ParsedIRI;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.helpers.BasicWriterSettings;
import org.eclipse.rdf4j.rio.turtle.TurtleUtil;
import org.eclipse.rdf4j.rio.turtle.TurtleWriter;

/**
 * pretty-print turtle writer that prints only namespaces that were used in the serialized model
 */
public class PrettyPrintTurtleWriter extends TurtleWriter {

    public PrettyPrintTurtleWriter(OutputStream out, ParsedIRI baseIRI) {
        super(out, baseIRI);
        this.setConfig();
    }

    public PrettyPrintTurtleWriter(Writer writer, ParsedIRI baseIRI) {
        super(writer, baseIRI);
        this.setConfig();
    }

    public PrettyPrintTurtleWriter(OutputStream out) {
        super(out);
        this.setConfig();
    }

    public PrettyPrintTurtleWriter(Writer writer) {
        super(writer);
        this.setConfig();
    }

    private void setConfig() {
        // we need to set INLINE_BLANK_NODES to true to make sure that we get "perfect"
        // pretty print, rdf4j will buffer the whole model.
        this.set(BasicWriterSettings.INLINE_BLANK_NODES, true);
        this.set(BasicWriterSettings.PRETTY_PRINT, true);
    }

    @Override
    public void endRDF() throws RDFHandlerException {
        // for rdf4j pretty-print turtle writer the actual turtle is buffered and will be
        // written only when endRDF is called.
        // So we can collect all prefixes used in the model and then writes them to the output here.
        final Set<String> usedNamespaces = new HashSet<>();

        this.bufferedStatements.forEach(statement -> {
                if (statement.getSubject() instanceof IRI) {
                    String namespace = extractNamespace(statement.getSubject().stringValue());
                    if (namespace != null) {
                        usedNamespaces.add(namespace);
                    }
                }
                if (statement.getPredicate() instanceof IRI) {
                    String namespace = extractNamespace(statement.getPredicate().stringValue());
                    if (namespace != null) {
                        usedNamespaces.add(namespace);
                    }
                }
                if (statement.getObject() instanceof IRI) {
                    String namespace = extractNamespace(statement.getObject().stringValue());
                    if (namespace != null) {
                        usedNamespaces.add(namespace);
                    }
                }
            });

        this.namespaceTable.forEach((name, prefix) -> {
                if (usedNamespaces.contains(prefix)) {
                    try {
                        super.writeNamespace(prefix, name);
                    } catch(IOException e) {
                        throw new RuntimeException(e);
                    }
                }
            });

        super.endRDF();
    }

    @Override
    protected void writeNamespace(String prefix, String name) throws IOException {
        // do nothing, we will write all namespaces on endRdf
    }

    private String extractNamespace(String uriString) {
        int split = TurtleUtil.findURISplitIndex(uriString);
        if (split > 0) {
            String namespace = uriString.substring(0, split);
            return this.namespaceTable.get(namespace);
        } else {
            return null;
        }
    }
}
