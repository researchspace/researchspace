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

package com.metaphacts.services.storage;

import static java.util.stream.Collectors.toList;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.inject.Inject;
import javax.validation.constraints.NotNull;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import com.metaphacts.plugin.PlatformPlugin;
import com.metaphacts.plugin.PlatformPluginManager;
import com.metaphacts.services.storage.api.ObjectKind;
import com.metaphacts.services.storage.api.ObjectMetadata;
import com.metaphacts.services.storage.api.ObjectRecord;
import com.metaphacts.services.storage.api.ObjectStorage;
import com.metaphacts.services.storage.api.PathMapping;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.services.storage.api.StorageConfig;
import com.metaphacts.services.storage.api.StorageConfigException;
import com.metaphacts.services.storage.api.StorageConfigLoader;
import com.metaphacts.services.storage.api.StorageCreationParams;
import com.metaphacts.services.storage.api.StorageException;
import com.metaphacts.services.storage.api.StoragePath;
import com.metaphacts.services.storage.api.StorageRegistry;
import com.metaphacts.services.storage.file.NonVersionedFileStorage;

/**
 * Main {@link PlatformStorage} implementation for the platform.
 */
public class MainPlatformStorage implements PlatformStorage {
    private static final Logger logger = LogManager.getLogger(MainPlatformStorage.class);

    private final Map<String, StorageDescription> storages = new LinkedHashMap<>();
    private final List<String> appSearchOrder = new ArrayList<>();

    private final PathMapping appPaths = new PathMapping.Default();

    private static class StorageDescription {
        public final String storageId;
        public final ObjectStorage storage;
        public final StoragePath storedKindPrefix;

        public StorageDescription(String storageId, ObjectStorage storage) {
            this(storageId, storage, StoragePath.EMPTY);
        }

        public StorageDescription(String storageId, ObjectStorage storage, StoragePath storedKindPrefix) {
            this.storageId = storageId;
            this.storage = storage;
            this.storedKindPrefix = storedKindPrefix;
        }
    }

    @Inject
    public MainPlatformStorage(PlatformPluginManager pluginManager, StorageRegistry storageRegistry) {
        try {
            initialize(pluginManager, storageRegistry);
        } catch (StorageConfigException | StorageException ex) {
            logger.error("Failed to initialize platform storage system: " + ex.getMessage());
            logger.debug("Details: ", ex);
            throw new StorageConfigException("Failed to initialize platform storage system", ex);
        }
    }

    private void initialize(
        PlatformPluginManager pluginManager, StorageRegistry storageRegistry
    ) throws StorageConfigException, StorageException {
        StorageConfigLoader storageConfigLoader = new StorageConfigLoader(storageRegistry);
        LinkedHashMap<String, StorageConfig> internalConfigs = storageConfigLoader
            .readInternalStorageConfig(PlatformStorage.class.getClassLoader());

        for (Map.Entry<String, StorageConfig> entry : internalConfigs.entrySet()) {
            logger.info("Adding internal storage '{}':", entry.getKey());
            addStorageFromConfig(storageRegistry, entry.getKey(), entry.getValue());
        }

        List<PlatformPlugin> plugins = PlatformPluginManager
            .asPlatformPlugins(pluginManager.getPlugins());

        for (PlatformPlugin plugin : plugins) {
            String pluginId = plugin.getWrapper().getPluginId();
            Path pluginPath = plugin.getWrapper().getPluginPath();
            boolean mutable = Configuration.arePluginBasedAppsMutable();
            createFileStorageWithFallbacks(pluginId, pluginPath, mutable);
            logger.info("Created {} storage for plugin '{}' at: {}",
                mutable ? "mutable" : "readonly", pluginId, pluginPath);
        }

        LinkedHashMap<String, StorageConfig> globalConfigs = storageConfigLoader.readSystemStorageConfig();
        for (Map.Entry<String, StorageConfig> entry : globalConfigs.entrySet()) {
            if (storages.containsKey(entry.getKey())) {
                logger.info("Overriding storage '" + entry.getKey() + "' by storage configuration:");
            }
            addStorageFromConfig(storageRegistry, entry.getKey(), entry.getValue());
        }

        if (!storages.containsKey(DEVELOPMENT_RUNTIME_STORAGE_KEY)) {
            Path runtimeFolder = Paths.get(Configuration.getRuntimeDirectory());
            logger.info(
                "Runtime storage is not defined, creating one as mutable file storage at: {}",
                runtimeFolder
            );
            createFileStorageWithFallbacks(
                DEVELOPMENT_RUNTIME_STORAGE_KEY, runtimeFolder, true);
        }
    }

    @Override
    public PathMapping getPathMapping() {
        return appPaths;
    }

    @Override
    public ObjectMetadata getDefaultMetadata() {
        String author = StorageUtils.currentUsername().orElse(null);
        return new ObjectMetadata(author, null);
    }

    private void createFileStorageWithFallbacks(String baseStorageId, Path root, boolean mutable) {
        // try to read from "images/" directory as fallback to preserve backwards compatibility
        Path imagesFolder = root.resolve("images");
        if (Files.isDirectory(imagesFolder)) {
            String imagesStorageId = baseStorageId + "/" + "images";
            logger.warn(
                "Creating fallback readonly storage '{}' at: {}",
                imagesStorageId, imagesFolder
            );
            addStorageAsFirstInSearchOrder(new StorageDescription(
                imagesStorageId,
                new NonVersionedFileStorage(
                    new PathMapping.MapPrefix(
                        appPaths,
                        ObjectKind.ASSET.resolve("images"),
                        StoragePath.EMPTY
                    ),
                    new NonVersionedFileStorage.Config(imagesFolder)
                ),
                ObjectKind.ASSET
            ));
        }

        // try to read from resource/* directory as fallback to preserve backwards compatibility
        Path pageLayoutFolder = root.resolve("resources/com/metaphacts/ui/templates");
        if (Files.isDirectory(pageLayoutFolder)) {
            String pageLayoutStorageId = baseStorageId + "/" + "page-layout";
            logger.warn(
                "Creating fallback readonly storage '{}' at: {}",
                pageLayoutStorageId, pageLayoutFolder
            );
            addStorageAsFirstInSearchOrder(new StorageDescription(
                pageLayoutStorageId,
                new NonVersionedFileStorage(
                    new PathMapping.MapPrefix(
                        appPaths,
                        ObjectKind.CONFIG.resolve("page-layout"),
                        StoragePath.EMPTY
                    ),
                    new NonVersionedFileStorage.Config(pageLayoutFolder)
                ),
                ObjectKind.CONFIG
            ));
        }

        NonVersionedFileStorage.Config config = new NonVersionedFileStorage.Config(root);
        config.setMutable(mutable);
        addStorageAsFirstInSearchOrder(new StorageDescription(
            baseStorageId,
            new NonVersionedFileStorage(appPaths, config)
        ));
    }

    private void addStorageFromConfig(
        StorageRegistry storageRegistry, String storageId, StorageConfig config
    ) throws StorageException {
        logger.info("Creating {} storage '{}' with config type {}",
            config.isMutable() ? "mutable" : "readonly", storageId, config.getClass().getName());

        PathMapping pathMapping = appPaths;
        if (config.getSubroot() != null) {
            pathMapping = new PathMapping.MapPrefix(
                pathMapping, StoragePath.EMPTY, StoragePath.parse(config.getSubroot())
            );
        }

        StorageCreationParams params = new StorageCreationParams(
            pathMapping, PlatformStorage.class.getClassLoader());
        ObjectStorage storage = storageRegistry
                .get(config.getStorageType())
                .orElseThrow(() -> new StorageConfigException(
                    "No storage factory for storage type" + config.getStorageType()
                ))
                .makeStorage(config, params);
        addStorageAsFirstInSearchOrder(new StorageDescription(storageId, storage));
    }

    private void addStorageAsFirstInSearchOrder(StorageDescription description) {
        storages.put(description.storageId, description);
        // we may have already initialized a default app storage for the given id
        // and as such must first remove it
        if (appSearchOrder.remove(description.storageId)){
            logger.info("Replacing initial storage with id '" +
                description.storageId + "' in app search order.");
        }
        appSearchOrder.add(0, description.storageId);
    }

    @Override
    public Optional<FindResult> findObject(StoragePath path) throws StorageException {
        logger.trace("Searching for single object at: {}", path);
        for (String appId : appSearchOrder) {
            StorageDescription description = storages.get(appId);
            if (!description.storedKindPrefix.isPrefixOf(path)) {
                continue;
            }
            Optional<ObjectRecord> found = description.storage.getObject(path, null);
            if (found.isPresent()) {
                ObjectRecord record = found.get();
                logger.trace(
                    "Found object in storage '{}' with revision {}", appId, record.getRevision());
                return Optional.of(new FindResult(appId, record));
            }
        }
        logger.trace("None objects found at: {}", path);
        return Optional.empty();
    }

    @Override
    public Map<StoragePath, FindResult> findAll(StoragePath prefix) throws StorageException {
        logger.trace("Searching for all objects with prefix: {}", prefix);
        Map<StoragePath, FindResult> objectsById = new HashMap<>();
        for (String appId : Lists.reverse(appSearchOrder)) {
            StorageDescription description = storages.get(appId);
            if (!description.storedKindPrefix.isPrefixOf(prefix)) {
                continue;
            }

            List<ObjectRecord> objects = description.storage.getAllObjects(prefix);
            int beforeSize = objectsById.size();

            for (ObjectRecord record : objects) {
                objectsById.put(record.getPath(), new FindResult(appId, record));
            }

            if (logger.isTraceEnabled()) {
                int added = objectsById.size() - beforeSize;
                int overridden = objects.size() - added;
                logger.trace(
                    "Found {} objects in storage '{}': {} added, {} overridden",
                    objects.size(), appId, added, overridden
                );
            }
        }
        logger.trace(
            "Found {} objects in total with prefix: {}",
            objectsById.size(), prefix);
        return objectsById;
    }

    @Override
    public List<FindResult> findOverrides(StoragePath path) throws StorageException {
        logger.trace("Searching for overrides of an object at: {}", path);
        List<FindResult> results = new ArrayList<>();
        for (String appId : Lists.reverse(appSearchOrder)) {
            StorageDescription description = storages.get(appId);
            if (!description.storedKindPrefix.isPrefixOf(path)) {
                continue;
            }
            Optional<ObjectRecord> found = description.storage.getObject(path, null);
            if (found.isPresent()) {
                ObjectRecord record = found.get();
                logger.trace(
                    "Found override in storage '{}' with revision {}",
                    appId, record.getRevision());
                results.add(new FindResult(appId, record));
            }
        }
        logger.trace("Found {} overrides for an object at: {}", results.size(), path);
        return results;
    }

    @NotNull
    @Override
    public ObjectStorage getStorage(String appId) {
        StorageDescription description = storages.get(appId);
        if (description == null) {
            throw new IllegalArgumentException(
                "Cannot get storage for unknown appId = \"" + appId + "\"");
        }
        return description.storage;
    }

    @Override
    public List<String> getOverrideOrder() {
        return Lists.reverse(appSearchOrder);
    }

    @Override
    public List<StorageStatus> getStorageStatusFor(StoragePath prefix) {
        return Lists.reverse(appSearchOrder).stream()
            .map(storageId -> storages.get(storageId))
            .filter(desc -> desc.storedKindPrefix.isPrefixOf(prefix))
            .map(desc -> new StorageStatus(desc.storageId, desc.storage.isMutable()))
            .collect(toList());
    }
}
