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

package com.metaphacts.federation.repository;

import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.io.IOException;
import java.io.InputStream;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.metaphacts.federation.repository.service.ServiceDescriptor;
import com.metaphacts.repository.MpRepositoryVocabulary;
import com.metaphacts.services.storage.StorageUtils;
import com.metaphacts.services.storage.api.*;
import com.metaphacts.services.storage.api.PlatformStorage.FindResult;

import javax.annotation.Nullable;
import javax.inject.Singleton;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.RDF4JException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;

/**
 * A registry for custom service types defined using {@link ServiceDescriptor}s.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
@Singleton
public class MpSparqlServiceRegistry {
    private static final StoragePath SERVICES_OBJECT_PREFIX = ObjectKind.CONFIG.resolve("services");

    private static final Logger logger = LogManager.getLogger(MpSparqlServiceRegistry.class);
    
    private static final Pattern configFilePattern = Pattern.compile("[^a-zA-Z0-9.-]");

    private final PlatformStorage platformStorage;

    private final Object descriptorsLock = new Object();
    private final Map<IRI, ServiceDescriptor> descriptorsByIri = new HashMap<>();
    private final Map<String, ServiceDescriptor> descriptorsById = new HashMap<>();

    @Inject
    public MpSparqlServiceRegistry(PlatformStorage platformStorage) throws IOException {
        this.platformStorage = platformStorage;
        init();
    }

    private static String normalizeServiceConfigId(final String serviceID) {
        return configFilePattern.matcher(serviceID).replaceAll("-");
    }

    private static StoragePath getConfigObjectId(String serviceID) {
        return SERVICES_OBJECT_PREFIX
            .resolve(normalizeServiceConfigId(serviceID))
            .addExtension(".ttl");
    }

    public Optional<ServiceDescriptor> getDescriptorForId(String id) {
        synchronized (descriptorsLock) {
            return Optional.ofNullable(descriptorsById.get(id));
        }
    }

    public Optional<ServiceDescriptor> getDescriptorForIri(IRI serviceIri) {
        synchronized (descriptorsLock) {
            return Optional.ofNullable(descriptorsByIri.get(serviceIri));
        }
    }
    
    protected void init() throws IOException {
        List<ObjectRecord> turtleFiles = platformStorage.findAll(SERVICES_OBJECT_PREFIX)
            .values().stream()
            .map(result -> result.getRecord())
            .filter(record -> record.getPath().hasExtension(".ttl"))
            .collect(Collectors.toList());

        for (ObjectRecord configFile : turtleFiles) {
            try (InputStream content = configFile.getLocation().readContent()) {
                String serviceId = StoragePath.removeAnyExtension(configFile.getPath().getLastComponent());
                Model model = Rio.parse(content, "", RDFFormat.TURTLE);
                Optional<IRI> optional = Models
                        .subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE));

                if (!optional.isPresent()) {
                    throw new RepositoryConfigException(
                        "Object at path \"" + configFile.getPath()
                            + "\" does not contain a service descriptor");
                }

                ServiceDescriptor descriptor = new ServiceDescriptor(serviceId);
                descriptor.parse(model, optional.get());

                addServiceDescriptor(descriptor, false);
            } catch (IOException | RDF4JException e) {
                logger.warn(
                        "Error while creating the repository config object from the configuration model:{}",
                        e.getMessage());
            }
        }
    }

    public void addOrUpdateServiceConfig(
        String serviceId, String configText, @Nullable ServiceDescriptor existing
    ) throws IllegalArgumentException, StorageException {
        StoragePath objectId = getConfigObjectId(serviceId);
        Model serviceDescriptorModel;

        try {
            serviceDescriptorModel = Rio.parse(new StringReader(configText), "", RDFFormat.TURTLE);
        } catch (Exception e) {
            String msg = "Could not parse the submitted service descriptor object at path \""
                + objectId + "\": " + e.getMessage();
            throw new IllegalArgumentException(msg, e);
        }

        Optional<IRI> optSubjectIri = Models.subjectIRI(
            serviceDescriptorModel.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE));

        if (!optSubjectIri.isPresent()) {
            String msg = "Invalid format of the service descriptor file: must contain an instance of type "
                + MpRepositoryVocabulary.SERVICE_TYPE.stringValue();
            throw new IllegalArgumentException(msg);
        }

        if (existing == null) {
            // For newly added service descriptors, the new IRI must be unique
            if (getDescriptorForIri(optSubjectIri.get()).isPresent()) {
                String msg = "A service with IRI " + optSubjectIri.get().stringValue()
                    + " already described in another file.";
                throw new IllegalArgumentException(msg);
            }
        } else if (!optSubjectIri.get().equals(existing.getServiceIRI())) {
            // For edited existing service descriptors, the IRI should not be changed
            String msg = "Editing the descriptor must not change the IRI of the service: the new one was "
                + optSubjectIri.get().stringValue() + " while the old one was "
                + existing.getServiceIRI().stringValue();
            throw new IllegalArgumentException(msg);
        }

        byte[] content = configText.getBytes(StandardCharsets.UTF_8);
        try {
            ObjectStorage targetStorage = platformStorage
                .getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY);

            targetStorage.appendObject(
                objectId,
                platformStorage.getDefaultMetadata(),
                new ByteArrayInputStream(content),
                content.length
            );

            ServiceDescriptor newDescriptor = new ServiceDescriptor(serviceId);
            newDescriptor.parse(serviceDescriptorModel, optSubjectIri.get());

            addServiceDescriptor(newDescriptor, true);
        } catch (StorageException e) {
            throw new StorageException(
                "Could not write the repository configuration object at path \""
                + objectId + "\": " + e.getMessage(), e);
        }
    }

    public void addServiceDescriptor(ServiceDescriptor serviceDescriptor, boolean modified) {
        synchronized (descriptorsLock) {
            descriptorsByIri.put(serviceDescriptor.getServiceIRI(), serviceDescriptor);
            descriptorsById.put(serviceDescriptor.getServiceId(), serviceDescriptor);
        }
    }

    public Map<IRI, ServiceDescriptor> getDescriptors() {
        synchronized (descriptorsLock) {
            return ImmutableMap.copyOf(descriptorsByIri);
        }
    }
    
    public String getDescriptorText(String id) throws IOException {
        FindResult serviceConfig = platformStorage
            .findObject(getConfigObjectId(id))
            .orElseThrow(() -> new IOException(
                "Descriptor with ID '" + id + "' was not found in the storage"));

        try {
            return StorageUtils.readTextContent(serviceConfig.getRecord());
        } catch (IOException e) {
            throw new IOException(
                "Error while reading repository configuration file from file system: "
                + e.getMessage(), e);
        }
    }
    
    public void deleteDescriptor(String id) throws IOException {
        ServiceDescriptor descriptor = this.getDescriptorForId(id)
            .orElseThrow(() -> new IllegalArgumentException("Non-existing service ID: " + id));
        
        Optional<FindResult> optServiceConfig = platformStorage
            .findObject(getConfigObjectId(id));
        
        if (optServiceConfig.isPresent()) {
            FindResult res = optServiceConfig.get();
            ObjectStorage storage = platformStorage.getStorage(res.getAppId());
            storage.deleteObject(
                res.getRecord().getPath(),
                platformStorage.getDefaultMetadata()
            );
        }

        synchronized (descriptorsLock) {
            descriptorsByIri.remove(descriptor.getServiceIRI());
            descriptorsById.remove(descriptor.getServiceId());
        }
    }

}
