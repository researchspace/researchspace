/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.rest.endpoint;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.util.HashMap;
import java.util.Set;

import javax.inject.Inject;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.OWL;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryResult;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.Rio;
import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.io.OWLOntologyDocumentSource;
import org.semanticweb.owlapi.io.StreamDocumentSource;
import org.semanticweb.owlapi.model.MissingImportHandlingStrategy;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyFactory;
import org.semanticweb.owlapi.model.OWLOntologyLoaderConfiguration;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.util.OWLOntologyImportsClosureSetProvider;
import org.semanticweb.owlapi.util.OWLOntologyMerger;

import uk.ac.manchester.cs.owl.owlapi.ParsableOWLOntologyFactory;

import com.google.common.base.Throwables;
import com.google.common.collect.Maps;
import com.metaphacts.repository.RepositoryManager;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class OntologyManager {

    @Inject
    private RepositoryManager repositoryManager;

    private final ValueFactory vf = SimpleValueFactory.getInstance();

    private static final Logger logger = LogManager.getLogger(OntologyManager.class);

    public OWLOntology loadOntology(IRI ontologyIri, boolean resolveImportClosure)
            throws IOException, OWLOntologyCreationException {
        OWLOntologyManager ontologyManager = OWLManager.createOWLOntologyManager();

        for (OWLOntologyFactory f : ontologyManager.getOntologyFactories()) {
            if (f instanceof ParsableOWLOntologyFactory) {
                ontologyManager.removeOntologyFactory(f);
            }
        }

        OWLOntologyLoaderConfiguration loaderConfig = new OWLOntologyLoaderConfiguration()
                .setFollowRedirects(true)
                .setMissingImportHandlingStrategy(MissingImportHandlingStrategy.SILENT)
                .setStrict(false);

        ontologyManager.addOntologyFactory(new PlatformOntologyFactory(loaderConfig));

        InputStream in = exportOntologyFromRepositoryToInputStream(ontologyIri);
        final OWLOntology ontology = ontologyManager.loadOntologyFromOntologyDocument(
                new StreamDocumentSource(in, org.semanticweb.owlapi.model.IRI.create(ontologyIri
                        .stringValue())), loaderConfig);

        if (!resolveImportClosure) {
            return ontology;
        }

        Set<OWLOntology> importClosure = ontology.getImports();
        logger.trace("Import closure of ontology {} : {} ", ontologyIri.stringValue(), importClosure);
        OWLOntology merged = null;
        for (OWLOntology importIri : importClosure) {
            logger.info("Ontology {} has {} classes", importIri.getOntologyID().getOntologyIRI(),
                    importIri.getClassesInSignature().size());
        }
        try {
            OWLOntologyMerger merger = new OWLOntologyMerger(
                    new OWLOntologyImportsClosureSetProvider(ontologyManager, ontology));
            ontologyManager.removeOntology(ontology);
            merged = merger.createMergedOntology(ontologyManager,
                    org.semanticweb.owlapi.model.IRI.create(ontologyIri.stringValue()));
            return merged;
        } catch (OWLOntologyCreationException e) {
            logger.error("Could not merge ontologies:", e);
            throw Throwables.propagate(e);
        }
    }

    private class PlatformOntologyFactory extends ParsableOWLOntologyFactory {
        private static final long serialVersionUID = 8250010324694004777L;

        protected OWLOntologyLoaderConfiguration loaderConfig;

        public PlatformOntologyFactory(OWLOntologyLoaderConfiguration config) {
            super();
            this.loaderConfig = config;
        }

        @Override
        public boolean canLoad(OWLOntologyDocumentSource documentSource) {
            return canLoadFromRepository(documentSource) ? true : super.canLoad(documentSource);
        }

        @Override
        public OWLOntology loadOWLOntology(OWLOntologyDocumentSource documentSource,
                OWLOntologyCreationHandler mediator) throws OWLOntologyCreationException {
            // needs override here, since otherwise the super method will create a new loader config
            return this.loadOWLOntology(documentSource, mediator, this.loaderConfig);
        }

        @Override
        public OWLOntology loadOWLOntology(OWLOntologyDocumentSource documentSource,
                OWLOntologyCreationHandler mediator, OWLOntologyLoaderConfiguration configuration)
                throws OWLOntologyCreationException {
            // try to read from platform's triple store
            if (canLoadFromRepository(documentSource)) {
                try {
                    return super.loadOWLOntology(
                            new StreamDocumentSource(exportOntologyFromRepositoryToInputStream(vf
                                    .createIRI(documentSource.getDocumentIRI().toString())),
                                    documentSource.getDocumentIRI()), mediator, loaderConfig);
                } catch (IOException e) {
                    logger.error("Error when parsing {} from StreamOntologyInput: {}",
                            documentSource.getDocumentIRI().toString(), e.getStackTrace());
                    throw Throwables.propagate(e);
                }

            } else {
                return super.loadOWLOntology(documentSource, mediator, loaderConfig);
            }

        }

        private boolean canLoadFromRepository(OWLOntologyDocumentSource documentSource) {
            return getAvailableOntologies().contains(
                    vf.createIRI(documentSource.getDocumentIRI().toString()));
        }
    }

    public InputStream exportOntologyFromRepositoryToInputStream(IRI ontologyIri)
            throws IllegalArgumentException, IOException {
        PipedInputStream in = new PipedInputStream();
        PipedOutputStream out = new PipedOutputStream(in);
        if (!getAllOntologies().containsKey(ontologyIri)) {
            throw new IllegalArgumentException("Ontology with IRI "+ontologyIri +" does not exist or can not be identified uniquely.");
        }
        new Thread(new Runnable() {
            public void run() {
                try {
                    writeOntologyToOutputStream(ontologyIri, out);
                } catch (IOException e) {
                    throw Throwables.propagate(e);
                }
            }
        }).start();
        return in;
    }

    private void writeOntologyToOutputStream(final IRI ontologyIRI, final OutputStream os)
            throws IOException {
        try (RepositoryConnection con = repositoryManager.getDefault().getConnection()) {
            IRI contextToExport = getAllOntologies().get(ontologyIRI);
            logger.debug("Named graph that will be exported {} for ontology {}", contextToExport.stringValue(), ontologyIRI.stringValue());
            try (RepositoryResult<Statement> res = con.getStatements(null, null, null, contextToExport)) {
                RDFWriter writer = Rio.createWriter(RDFFormat.RDFXML, os);
                try {
                    int i = 0;
                    writer.startRDF();
                    while (res.hasNext()) {
                        i++;
                        writer.handleStatement(res.next());
                    }
                    writer.endRDF();
                    logger.trace("Handled {} staments when writing the ontology {} to the outputstream.", i, ontologyIRI.stringValue());
                } catch (RDFHandlerException e) {
                    throw Throwables.propagate(e);
                } finally {
                    os.close();
                }
            }
        }
    }

    public Set<IRI> getAvailableOntologies() {
        return getAllOntologies().keySet();
    }

    /**
     * Returns a map with ontology- and respective named graph identifiers.
     * @return
     */
    private HashMap<IRI, IRI> getAllOntologies() {
        HashMap<IRI, IRI> set = Maps.newHashMap();
        try (RepositoryConnection con = repositoryManager.getDefault().getConnection()) {
            try (RepositoryResult<Statement> res = con.getStatements(null, RDF.TYPE, OWL.ONTOLOGY)) {
                while (res.hasNext()) {
                    Statement it = res.next();
                    if ((it.getSubject() instanceof IRI) && (it.getContext() instanceof IRI)) {
                        set.put((IRI) it.getSubject(), (IRI) it.getContext());
                    } else {
                        logger.warn(
                                "Resource {} which is declared as owl:Ontology is not an IRI or not contained in any named graph.",
                                it.getSubject());
                    }
                }
            }

        }
        return set;
    }

}
