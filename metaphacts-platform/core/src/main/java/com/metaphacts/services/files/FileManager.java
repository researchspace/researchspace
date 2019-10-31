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

package com.metaphacts.services.files;

import com.google.common.collect.Sets;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.FileContainer;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.data.rdf.container.LDPResource;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.services.storage.api.*;
import com.metaphacts.vocabulary.LDP;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.*;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import javax.inject.Inject;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Optional;
import java.util.Random;

public class FileManager {
    private static final String RESOURCE_IRI = "__resourceIri__";
    private static final String DOCUMENT_NAME = "__fileName__";
    private static final String MEDIA_TYPE = "__mediaType__";
    private static final String CONTEXT_URI = "__contextUri__";
    private static final String DEFAULT_CONTEXT_IRI = "http://www.metaphacts.com/ontologies/platform#file";

    private final ValueFactory vf = SimpleValueFactory.getInstance();
    private final Random sequenceGenerator = new SecureRandom();

    @Inject
    public FileManager() {}

    public String generateSequenceNumber() {
        return String.valueOf(Math.abs(sequenceGenerator.nextLong()));
    }

    public StoragePath parseTargetDirectory(String directory) {
        StoragePath prefix = StoragePath.parse(directory);
        if (prefix.isEmpty()) {
            throw new IllegalArgumentException("Target directory path cannot be empty");
        }
        return prefix;
    }

    public Optional<ObjectRecord> fetchFile(
        ObjectStorage storage,
        ManagedFileName fileName
    ) throws StorageException {
        return storage.getObject(fileName.toObjectId(), null);
    }

    public void storeFile(
        ObjectStorage storage,
        ManagedFileName fileName,
        ObjectMetadata metadata,
        SizedStream content
    ) throws StorageException {
        storage.appendObject(
            fileName.toObjectId(),
            metadata,
            content.getStream(),
            content.getLength()
        );
    }

    /**
     * @throws FileNotFoundException - when source file was not found
     * @throws IOException - when other error happens in the process of move of clean up
     */
    public void moveFile(
        ObjectStorage source,
        ObjectStorage target,
        ManagedFileName fileName
    ) throws IOException {
        if (source == target) {
            throw new IllegalArgumentException("Cannot move file to the sane storage as it's from");
        }

        Optional<ObjectRecord> found = source
            .getObject(fileName.toObjectId(), null);
        if (!found.isPresent()) {
            throw new FileNotFoundException(
                "Source file to move not found: " + fileName.toObjectId());
        }

        ObjectRecord record = found.get();
        try (SizedStream content = record.getLocation().readSizedContent()) {
            target.appendObject(
                fileName.toObjectId(),
                record.getMetadata(),
                content.getStream(),
                content.getLength()
            );
        } catch (IOException e) {
            throw new IOException("Failed to move file: " + fileName.toObjectId(), e);
        }

        try {
            source.deleteObject(fileName.toObjectId(), record.getMetadata());
        } catch (StorageException e) {
            throw new IOException(
                "Failed to delete source file after move: " + fileName.toObjectId(), e);
        }
    }

    public void deleteFile(
        ObjectStorage storage,
        ManagedFileName fileName,
        ObjectMetadata metadata
    ) throws StorageException {
        storage.deleteObject(fileName.toObjectId(), metadata);
    }

    public IRI createLdpResource(
        ManagedFileName fileName,
        MpRepositoryProvider repositoryProvider,
        String generateIriQuery,
        String createResourceQuery,
        String contextUri,
        String mediaType
    ) {
        FileContainer fileContainer = (FileContainer) LDPImplManager.getLDPImplementation(
            FileContainer.IRI,
            Sets.newHashSet(LDP.Container, LDP.Resource),
            repositoryProvider
        );

        boolean generateIriFromQuery = generateIriQuery != null && !generateIriQuery.isEmpty();

        IRI resourceIri;
        if (generateIriFromQuery) {
            // generating file iri
            resourceIri = generateIriFromQuery(
                fileName,
                repositoryProvider,
                contextUri,
                generateIriQuery,
                mediaType
            );
        } else {
            boolean isContextUriEmpty = contextUri == null || contextUri.isEmpty();
            resourceIri = vf.createIRI(
                (isContextUriEmpty ? DEFAULT_CONTEXT_IRI : contextUri) + fileName.getName()
            );
        }

        // creating resource data
        PointedGraph resourcePointedGraph = processQuery(
            fileName,
            repositoryProvider,
            resourceIri,
            createResourceQuery,
            contextUri,
            mediaType
        );

        // adding resource to container
        fileContainer.add(resourcePointedGraph);

        return resourceIri;
    }

    public void deleteLdpResource(
        IRI resourceIri,
        MpRepositoryProvider repositoryProvider
    ) throws RepositoryException {
        LDPResource fileResource = LDPImplManager.getLDPImplementation(
            resourceIri,
            Sets.newHashSet(LDP.Container, LDP.Resource),
            repositoryProvider
        );
        fileResource.delete();
    }

    private IRI generateIriFromQuery(
        ManagedFileName fileName,
        MpRepositoryProvider repositoryProvider,
        String contextUri,
        String generateIriQuery,
        String mediaType
    ) {
        if (generateIriQuery == null || generateIriQuery.isEmpty()) {
            throw new IllegalArgumentException("Generate IRI query cannot be empty");
        }

        RepositoryConnection connection = repositoryProvider.getRepository().getConnection();
        SparqlOperationBuilder<TupleQuery> operationBuilder =
            SparqlOperationBuilder.create(generateIriQuery, TupleQuery.class);

        operationBuilder = operationBuilder
            .setBinding(DOCUMENT_NAME, vf.createLiteral(fileName.getName()))
            .setBinding(MEDIA_TYPE, vf.createLiteral(mediaType));

        if (contextUri != null && !contextUri.isEmpty()) {
            operationBuilder = operationBuilder.setBinding(CONTEXT_URI, vf.createIRI(contextUri));
        }
        TupleQuery query = operationBuilder.build(connection);

        TupleQueryResult result = query.evaluate();
        Binding binding = QueryResults.asList(result).get(0).getBinding("resourceIri");
        if (binding == null) {
            throw new IllegalStateException(
                "Generate IRI query returned no 'resourceIri' bindings");
        }

        return vf.createIRI(binding.getValue().toString());
    }

    private PointedGraph processQuery(
        ManagedFileName fileName,
        MpRepositoryProvider repositoryProvider,
        IRI resourceIri,
        String query,
        String contextUri,
        String mediaType
    ) throws RepositoryException, MalformedQueryException, QueryEvaluationException {
        try (RepositoryConnection connection = repositoryProvider.getRepository().getConnection()) {
            SparqlOperationBuilder<GraphQuery> operationBuilder =
                SparqlOperationBuilder.create(query, GraphQuery.class);
            operationBuilder = operationBuilder
                .setBinding(RESOURCE_IRI, resourceIri)
                .setBinding(DOCUMENT_NAME, vf.createLiteral(fileName.getName()))
                .setBinding(MEDIA_TYPE, vf.createLiteral(mediaType));

            if (contextUri != null && !contextUri.isEmpty()) {
                operationBuilder = operationBuilder.setBinding(CONTEXT_URI, vf.createIRI(contextUri));
            }
            GraphQueryResult result = operationBuilder.build(connection).evaluate();

            // asModel takes care of closing
            Model model = QueryResults.asModel(result);
            return new PointedGraph(resourceIri, model);
        }
    }
}
