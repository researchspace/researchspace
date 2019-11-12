/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

package org.researchspace.kp;

import java.util.Collection;
import java.util.Set;
import java.util.concurrent.ExecutionException;

import javax.inject.Inject;
import javax.inject.Singleton;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;

import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.FieldDefinitionContainer;
import com.metaphacts.data.rdf.container.LDPApiInterface;
import com.metaphacts.data.rdf.container.LDPContainer;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.data.rdf.container.PermissionsAwareLDPApiRegistry;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.vocabulary.FIELDS;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.model.BNode;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelBuilder;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.OWL;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.semarglproject.vocab.XSD;

/**
 * Generates Knowledge Patterns from owl:Ontology and stores them into Field LDP container.
 *
 * @author Artem Kozlov <artem@rem.sh>
 */
@Singleton
public class KnowledgePatternGenerator {

    private static final Logger logger = LogManager.getLogger(KnowledgePatternGenerator.class);

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private PermissionsAwareLDPApiRegistry apiRegistry;

    private ValueFactory vf = SimpleValueFactory.getInstance();

    public void generateKnowledgePatternsFromOntology(IRI ontoIri) {
        logger.debug("Generating KPs for ontology: {}", ontoIri);

        Repository repo = repositoryManager.getDefault();
        try(RepositoryConnection conn = repo.getConnection()) {
            // Our expectation is that ontology is that ontology is fully stored in the
            // named graph where it is defined as an ontology
            Resource[] graphs =
                Iterations.asList(conn.getStatements(ontoIri, RDF.TYPE, OWL.ONTOLOGY))
                .stream().map(s -> s.getContext()).distinct().toArray(Resource[] ::new);
            logger.trace("Ontology is found in the following graphs: {}", (Object[])graphs);

            Model ontology =
                QueryResults.asModel(conn.getStatements(null, null, null, graphs));

            Set<Resource> objectProperties =
                ontology.filter(null, RDF.TYPE, OWL.OBJECTPROPERTY).subjects();
            logger.trace("Generating KPs for {} object properties", objectProperties.size());
            objectProperties.forEach(op -> saveKp(generateOpKp(ontology, ontoIri, (IRI)op)));


            Set<Resource> datatypeProperties =
                ontology.filter(null, RDF.TYPE, OWL.DATATYPEPROPERTY).subjects();
            logger.trace("Generating KPs for {} datatype properties", datatypeProperties.size());
            datatypeProperties.forEach(op -> saveKp(generateDpKp(ontology, ontoIri, (IRI)op)));
        }
    }

    private void saveKp(PointedGraph kpGraph) {
        LDPContainer container =
            (LDPContainer)LDPImplManager.getLDPImplementation(
                                                              FieldDefinitionContainer.IRI,
                                                              Sets.newIdentityHashSet(),
                                                              new MpRepositoryProvider(repositoryManager, RepositoryManager.ASSET_REPOSITORY_ID)
                                                              );

        // check if KP already exist in the repository, if so remove it
        if(container.containsLDPResource(kpGraph.getPointer())) {
            logger.trace(
                         "KP {} already exists in the repository, so removing it.",
                         kpGraph.getPointer()
                         );
            ldpApi().deleteLDPResource(kpGraph.getPointer());
        }
        container.add(kpGraph);
    }

    private PointedGraph generateOpKp(Model onto, IRI ontoIri, IRI prop) {
        ModelBuilder builder = new ModelBuilder();
        IRI kpIri = this.generateBasicKp(builder, ontoIri, onto, prop);

        builder.subject(kpIri)
            .add(FIELDS.XSD_DATATYPE, this.vf.createIRI(XSD.ANY_URI));
        addAll(builder, FIELDS.RANGE, Models.getPropertyIRIs(onto, prop, RDFS.RANGE));

        return new PointedGraph(kpIri, builder.build());
    }

    private PointedGraph generateDpKp(Model onto, IRI ontoIri, IRI prop) {
        ModelBuilder builder = new ModelBuilder();
        IRI kpIri = this.generateBasicKp(builder, ontoIri, onto, prop);

        builder.subject(kpIri);
        addAll(builder, FIELDS.XSD_DATATYPE, Models.getPropertyIRIs(onto, prop, RDFS.RANGE));

        return new PointedGraph(kpIri, builder.build());
    }

    private IRI generateBasicKp(ModelBuilder builder, IRI ontoIri, Model onto, IRI prop) {
        IRI kpIri =
            this.vf.createIRI("http://www.researchspace.org/instances/fields/", prop.getLocalName());

        builder.subject(kpIri)
            .add(RDF.TYPE, FIELDS.FIELD_TYPE)
            .add(FIELDS.AUTOGENERATED, true)
            .add(FIELDS.ONTOLOGY, ontoIri)
            .add(FIELDS.MIN_OCCURS, "0")
            .add(FIELDS.MAX_OCCURS, "unbound");

        addAll(builder, RDFS.COMMENT, Models.getPropertyLiterals(onto, prop, RDFS.COMMENT));
        addAll(builder, RDFS.LABEL, Models.getPropertyLiterals(onto, prop, RDFS.LABEL));
        addAll(builder, FIELDS.DOMAIN, Models.getPropertyIRIs(onto, prop, RDFS.DOMAIN));

        // generate KP insert pattern and add it to the KP
        String insertPattern =
            "INSERT { $subject <" + prop.stringValue() + "> $value . } WHERE {}";
        BNode insertQueryNode = this.vf.createBNode();
        builder
            .add(kpIri, FIELDS.INSERT_PATTERN, insertQueryNode)
            .subject(insertQueryNode)
            .add(RDF.TYPE, SP.QUERY_CLASS)
            .add(SP.TEXT_PROPERTY, insertPattern);

        // generate KP select pattern and add it to the KP
        String selectPattern =
            "SELECT ?value ?label WHERE {\n" +
            "  $subject <" + prop.stringValue() + "> ?value . \n" +
            "  ?value rdfs:label ?label ." +
            "}";
        BNode selectQueryNode = this.vf.createBNode();
        builder
            .add(kpIri, FIELDS.SELECT_PATTERN, selectQueryNode)
            .subject(selectQueryNode)
            .add(RDF.TYPE, SP.QUERY_CLASS)
            .add(SP.TEXT_PROPERTY, selectPattern);

        return kpIri;
    };

    private ModelBuilder addAll(ModelBuilder builder, IRI prop, Collection<? extends Object> os) {
        os.stream().forEach(d -> builder.add(prop, d));
        return builder;
    }

    private LDPApiInterface ldpApi() {
        try {
            return apiRegistry.api(RepositoryManager.DEFAULT_REPOSITORY_ID);
        } catch (ExecutionException e) {
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
        }
    }

}
