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

package com.metaphacts.services.storage.file;

import static java.util.stream.Collectors.toList;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import javax.annotation.Nullable;

import com.metaphacts.services.storage.api.*;
import org.apache.commons.lang.StringUtils;

import com.google.common.collect.ImmutableList;
import com.metaphacts.services.storage.StorageUtils;

public class NonVersionedFileStorage implements ObjectStorage {
    public final static String STORAGE_TYPE = "nonVersionedFile";
    private static final String FIXED_REVISION = "";

    private final PathMapping paths;
    private final Config config;

    public NonVersionedFileStorage(PathMapping paths, Config config) {
        this.paths = paths;
        this.config = config;
    }

    public static final class Config extends StorageConfig {
        private Path root;

        public Config() {}

        public Config(Path root) {
            this.root = root;
        }

        @Override
        public String getStorageType() {
            return STORAGE_TYPE;
        }

        public Path getRoot() {
            return root;
        }

        public void setRoot(Path root) {
            this.root = root;
        }

        @Override
        public NonVersionedFileStorage createStorage(StorageCreationParams params) {
            return new NonVersionedFileStorage(params.getPathMapping(), this);
        }

		@Override
		protected void validate() throws StorageConfigException {
            super.validate();
			if (getRoot() == null) {
                throw new StorageConfigException("Missing required property 'root'");
            }
			if (!getRoot().isAbsolute()) {
                throw new StorageConfigException(
                    "'root' path must be absolute: '" + getRoot() + "'");
            }
			if (!Files.isDirectory(getRoot())) {
                throw new StorageConfigException(
                    "'root' path does not exists or not a directory: '" + getRoot() + "'");
            }
		}
    }

    private class DirectStorageLocation implements StorageLocation {
        public final Path objectFile;

        public DirectStorageLocation(Path objectFile) {
            this.objectFile = objectFile;
        }

        @Override
        public ObjectStorage getStorage() {
            return NonVersionedFileStorage.this;
        }

        @Override
        public InputStream readContent() throws IOException {
            return new FileInputStream(objectFile.toFile());
        }

        @Override
        public SizedStream readSizedContent() throws IOException {
            FileInputStream inputStream = new FileInputStream(objectFile.toFile());
            long size = inputStream.getChannel().size();
            return new SizedStream(inputStream, size);
        }
    }

    @Override
    public boolean isMutable() {
        return config.isMutable();
    }

    @Override
    public Optional<ObjectRecord> getObject(StoragePath path, @Nullable String revision) throws StorageException {
        if (revision != null && !revision.equals(FIXED_REVISION)) {
            return Optional.empty();
        }

        Optional<Path> mappedPath = fileFromObjectPath(path);
        if (!mappedPath.isPresent()) {
            return Optional.empty();
        }

        Path objectFile = mappedPath.get();
        if (!Files.isRegularFile(objectFile)) {
            return Optional.empty();
        }

        Instant creationDate;
        try {
            creationDate = getLastModified(objectFile);
        } catch (NoSuchFileException e) {
            return Optional.empty();
        } catch (IOException e) {
            throw new StorageException("Failed to read last modified time for file: " + objectFile, e);
        }

        StorageLocation key = new DirectStorageLocation(objectFile);
        ObjectMetadata metadata = new ObjectMetadata(null, creationDate);
        return Optional.of(
            new ObjectRecord(key, path, FIXED_REVISION, metadata)
        );
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        return getObject(path, null).map(ImmutableList::of).orElse(ImmutableList.of());
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        Optional<Path> mappedFolder = fileFromObjectPath(prefix);
        if (!mappedFolder.isPresent()) {
            return ImmutableList.of();
        }

        List<StoragePath> objectIds;
        try (Stream<Path> files = Files.walk(mappedFolder.get())) {
            objectIds = files
                .flatMap(file ->
                    objectPathFromFile(file)
                        .map(Stream::of).orElseGet(Stream::empty)
                )
                .filter(prefix::isPrefixOf)
                .collect(toList());
        } catch (NoSuchFileException e) {
            return ImmutableList.of();
        } catch (IOException e) {
            throw new StorageException("Failed to list directory: " + mappedFolder.get(), e);
        }

        List<ObjectRecord> objects = new ArrayList<>();
        for (StoragePath path : objectIds) {
            getObject(path, null).ifPresent(object -> {
                objects.add(object);
            });
        }
        return objects;
    }

    @Override
    public ObjectRecord appendObject(
        StoragePath path,
        ObjectMetadata metadata,
        InputStream content,
        long contentLength
    ) throws StorageException {
        StorageUtils.throwIfNonMutable(isMutable());
        Path objectPath = fileFromObjectPath(path).orElseThrow(() ->
            new StorageException(String.format("Cannot map object ID to path: %s", path)));
        try {
            Files.createDirectories(objectPath.getParent());
            Files.copy(content, objectPath, StandardCopyOption.REPLACE_EXISTING);
            StorageLocation key = new DirectStorageLocation(objectPath);
            ObjectMetadata createdMetadata = new ObjectMetadata(
                metadata.getAuthor(),
                getLastModified(objectPath)
            );
            return new ObjectRecord(key, path, FIXED_REVISION, createdMetadata);
        } catch (IOException e) {
            throw new StorageException(e);
        }
    }

    @Override
    public void deleteObject(
        StoragePath path,
        ObjectMetadata metadata
    ) throws StorageException {
        StorageUtils.throwIfNonMutable(isMutable());
        Path objectFile = fileFromObjectPath(path).orElseThrow(() ->
            new StorageException(String.format("Cannot map object path to filesystem: %s", path)));
        try {
            Files.deleteIfExists(objectFile);
        } catch (IOException e) {
            throw new StorageException("Failed to delete file: " + objectFile, e);
        }
    }

    private Instant getLastModified(Path file) throws IOException {
        return Files.getLastModifiedTime(file).toInstant();
    }

    private Optional<Path> fileFromObjectPath(StoragePath path) {
        return paths.mapForward(path)
            .map(mapped -> {
                String filesystemSubPath = mapped.toString()
                    .replace(StoragePath.SEPARATOR, File.separator);
                return config.getRoot().resolve(filesystemSubPath);
            })
            .map(Path::normalize);
    }

    private Optional<StoragePath> objectPathFromFile(Path file) {
        String absolutePath = file.toString();
        String absoluteBase = config.getRoot().toString();
        if (!absolutePath.startsWith(absoluteBase)) {
            return Optional.empty();
        }
        String relativeFilePath = absolutePath.substring(absoluteBase.length());
        String storagePath = StringUtils.removeStart(
            relativeFilePath.replace(File.separator, StoragePath.SEPARATOR),
            StoragePath.SEPARATOR
        );
        return paths.mapBack(StoragePath.parse(storagePath));
    }
}
