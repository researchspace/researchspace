/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
package org.researchspace.kp;

import java.util.Arrays;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.Set;
import java.util.stream.Stream;
import java.util.concurrent.ExecutionException;

import javax.inject.Inject;
import javax.inject.Singleton;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;

import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.data.rdf.container.FieldDefinitionContainer;
import org.researchspace.data.rdf.container.LDPApiInterface;
import org.researchspace.data.rdf.container.LDPContainer;
import org.researchspace.data.rdf.container.LDPImplManager;
import org.researchspace.data.rdf.container.LDPResource;
import org.researchspace.data.rdf.container.PermissionsAwareLDPApiRegistry;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;
import org.researchspace.repository.sparql.SPARQLBasicAuthRepositoryConfig;
import org.researchspace.vocabulary.FIELDS;

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
import org.eclipse.rdf4j.sail.SailException;
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

    public int generateKnowledgePatternsFromOntology(IRI ontoIri) throws IOException {
        int numberOfKPsGenerated = 0;

        logger.debug("Generating KPs for ontology: {}", ontoIri);

        Repository repo = repositoryManager.getRepository(RepositoryManager.ONTOLOGIES_REPOSITORY_ID);
        RepositoryConnection conn = repo.getConnection();

        MpSPARQLRepositoryConfig config = (MpSPARQLRepositoryConfig)repositoryManager
                                                    .getRepositoryConfig(repositoryManager.DEFAULT_REPOSITORY_ID)
                                                    .getRepositoryImplConfig();
        /**
         * Determine if default repository is writable and CRMOntologiesAndKPs can be automatically generated
         */          
        boolean defaultRepoWritable = config.isWritable();

        /**
         * Ontologies Repo just proxies to default
         */
        boolean enableCRMOntologiesAndKPs = true;//config.getCRMOntologiesAndKPs();

        if (defaultRepoWritable && enableCRMOntologiesAndKPs) {
            try(conn) {
                // Our expectation is that ontology is fully stored in the
                // named graph where it is defined as an ontology
                Resource[] owlGraphs =
                    Iterations.asList(conn.getStatements(ontoIri, RDF.TYPE, OWL.ONTOLOGY))
                    .stream().map(s -> s.getContext()).distinct().toArray(Resource[] ::new);

                Resource[] rdfsGraphs = Iterations.asList(conn.getStatements(ontoIri, RDF.TYPE, RDFS.CLASS))
                    .stream().map(s -> s.getContext()).distinct().toArray(Resource[] ::new);

                Resource[] graphs = Stream.concat(Arrays.stream(owlGraphs), Arrays.stream(rdfsGraphs))
                                    .toArray(Resource[]::new);

                logger.trace("Ontology is found in the following graphs: {}", (Object[])graphs);

                Model ontology =
                    QueryResults.asModel(conn.getStatements(null, null, null, graphs));
                
                Set<Resource> objectProperties =
                    ontology.filter(null, RDF.TYPE, OWL.OBJECTPROPERTY).subjects();
                logger.trace("Generating KPs for {} object properties", objectProperties.size());           
                Iterator<Resource> iterator = objectProperties.iterator();

                while (iterator.hasNext()) {
                    Resource resource = iterator.next();
                    if (resource.isIRI()) {
                        if (resource.toString().contains(ontoIri.stringValue()))
                            saveKp(generateOpKp(ontology, ontoIri, (IRI)resource));
                    }
                }
                
                numberOfKPsGenerated += objectProperties.size();

                Set<Resource> datatypeProperties =
                    ontology.filter(null, RDF.TYPE, OWL.DATATYPEPROPERTY).subjects();
                logger.trace("Generating KPs for {} datatype properties", datatypeProperties.size());
                datatypeProperties.forEach(op -> saveKp(generateDpKp(ontology, ontoIri, (IRI)op)));
                numberOfKPsGenerated += datatypeProperties.size();

                Set<Resource> rdfProperties =
                    ontology.filter(null, RDF.TYPE, RDF.PROPERTY).subjects();
                logger.trace("Generating KPs for {} datatype properties", rdfProperties.size());
                rdfProperties.forEach(op -> saveKp(generateOpKp(ontology, ontoIri, (IRI)op)));
                numberOfKPsGenerated += rdfProperties.size();
    /* 
                Set<Resource> annotationProperties =
                    ontology.filter(null, RDF.TYPE, OWL.ANNOTATIONPROPERTY).subjects();
                logger.trace("Generating KPs for {} annotation properties", annotationProperties.size());
                annotationProperties.forEach(op -> saveKp(generateApKp(ontology, ontoIri, (IRI)op)));
                numberOfKPsGenerated += annotationProperties.size();*/
            } 

            return numberOfKPsGenerated;
        }

        return 0;
    }

    private void saveKp(PointedGraph kpGraph) {
        LDPContainer container =
            (LDPContainer)LDPImplManager.getLDPImplementation(
                                                              FieldDefinitionContainer.IRI,
                                                              Sets.newIdentityHashSet(),
                                                              new MpRepositoryProvider(repositoryManager, RepositoryManager.ONTOLOGIES_REPOSITORY_ID)
                                                              );

        // check if KP doesn't already exist in the repository, create it
        if (!container.containsLDPResource(kpGraph.getPointer())) {
           container.add(kpGraph);
        }       
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

    private PointedGraph generateApKp(Model onto, IRI ontoIri, IRI prop) {
        ModelBuilder builder = new ModelBuilder();
        IRI kpIri = this.generateBasicKp(builder, ontoIri, onto, prop);

        builder.subject(kpIri);
        addAll(builder, FIELDS.XSD_DATATYPE, Models.getPropertyIRIs(onto, prop, RDFS.RANGE));

        return new PointedGraph(kpIri, builder.build());
    }

    private IRI generateBasicKp(ModelBuilder builder, IRI ontoIri, Model onto, IRI prop) {
        String ontoIriString = "";

        /* Adding a trailing # for ontologyIri cases like skos */
        if (!ontoIri.stringValue().endsWith("/") && !ontoIri.stringValue().endsWith("#")) {
            ontoIriString = ontoIri.stringValue()+"#";
        } else {
            ontoIriString = ontoIri.stringValue();
        }

        IRI kpIri =
            this.vf.createIRI(ontoIriString, prop.getLocalName());
        
        /* 
            Commented out additional triples that flag a KP is part of a particular ontology and autogenerated.
            Not necessary in the current iteration, were a KP identifier matches the owl:ObjectProperty, owl:DatatypeProperty, etc.
            so it is both a Field and a owl/rdf:Property. This introduced problems when duplicating KPs based on the ones in the ontology.
         */
        builder.subject(kpIri)
            .add(RDF.TYPE, FIELDS.FIELD_TYPE)
            //.add(FIELDS.AUTOGENERATED, true)
            //.add(FIELDS.ONTOLOGY, ontoIri)
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
            "  ?value rdfs:label|crm:P190_has_symbolic_content ?label ." +
            "}";
        BNode selectQueryNode = this.vf.createBNode();
        builder
            .add(kpIri, FIELDS.SELECT_PATTERN, selectQueryNode)
            .subject(selectQueryNode)
            .add(RDF.TYPE, SP.QUERY_CLASS)
            .add(SP.TEXT_PROPERTY, selectPattern);


        // generate KP delete pattern and add it to the KP
        String deletePattern =
            "DELETE { " +
            "  $subject <" + prop.stringValue() + "> ?value . \n" + 
            "} "+
            " WHERE {\n" +
            "  $subject <" + prop.stringValue() + "> ?value . \n" +
            "  " +
            "}";
        BNode deleteQueryNode = this.vf.createBNode();
        builder
            .add(kpIri, FIELDS.DELETE_PATTERN, deleteQueryNode)
            .subject(deleteQueryNode)
            .add(RDF.TYPE, SP.QUERY_CLASS)
            .add(SP.TEXT_PROPERTY, deletePattern);


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
