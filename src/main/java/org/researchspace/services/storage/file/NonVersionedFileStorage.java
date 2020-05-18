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

package org.researchspace.services.storage.file;

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

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.services.storage.StorageUtils;
import org.researchspace.services.storage.api.*;

import com.google.common.collect.ImmutableList;

public class NonVersionedFileStorage implements ObjectStorage {
    public final static String STORAGE_TYPE = "nonVersionedFile";
    private static final String FIXED_REVISION = "";
    
    private static final Logger logger = LogManager.getLogger(NonVersionedFileStorage.class);

    private final PathMapping paths;
    private final Config config;

    public NonVersionedFileStorage(PathMapping paths, Config config) {
        this.paths = paths;
        this.config = config;
    }

    public static final class Config extends StorageConfig {
        private Path root;

        public Config() {
        }

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
            if (!Files.isDirectory(getRoot())) {
                try {
                    logger.info("Storage root directory {} doesn't exist, trying to create it ...", getRoot());
                    Files.createDirectories(getRoot());
                } catch (IOException e) {
                    throw new StorageConfigException("Can't create storage root directory.", e);
                }
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
        return Optional.of(new ObjectRecord(key, path, FIXED_REVISION, metadata));
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
            objectIds = files.flatMap(file -> objectPathFromFile(file).map(Stream::of).orElseGet(Stream::empty))
                    .filter(prefix::isPrefixOf).collect(toList());
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
    public ObjectRecord appendObject(StoragePath path, ObjectMetadata metadata, InputStream content, long contentLength)
            throws StorageException {
        StorageUtils.throwIfNonMutable(isMutable());
        Path objectPath = fileFromObjectPath(path)
                .orElseThrow(() -> new StorageException(String.format("Cannot map object ID to path: %s", path)));
        try {
            Files.createDirectories(objectPath.getParent());
            Files.copy(content, objectPath, StandardCopyOption.REPLACE_EXISTING);
            StorageLocation key = new DirectStorageLocation(objectPath);
            ObjectMetadata createdMetadata = new ObjectMetadata(metadata.getAuthor(), getLastModified(objectPath));
            return new ObjectRecord(key, path, FIXED_REVISION, createdMetadata);
        } catch (IOException e) {
            throw new StorageException(e);
        }
    }

    @Override
    public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
        StorageUtils.throwIfNonMutable(isMutable());
        Path objectFile = fileFromObjectPath(path).orElseThrow(
                () -> new StorageException(String.format("Cannot map object path to filesystem: %s", path)));
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
        return paths.mapForward(path).map(mapped -> {
            String filesystemSubPath = mapped.toString().replace(StoragePath.SEPARATOR, File.separator);
            return config.getRoot().resolve(filesystemSubPath);
        }).map(Path::normalize);
    }

    private Optional<StoragePath> objectPathFromFile(Path file) {
        // Requested file path as well as storage root
        // can be absolute or relative to the current working directory.
        // So we need to normalize and convert them to absolute paths.
        Path absolutePath = file.toAbsolutePath().normalize();
        Path absoluteBase = config.getRoot().toAbsolutePath().normalize();

        // if requested path is not inside storage root we know immediately that
        // there is no such file in this storage
        if (!absolutePath.startsWith(absoluteBase)) {
            return Optional.empty();
        }

        // otherwise we calculate path to requested file relatively to the root
        String relativeFilePath = absoluteBase.relativize(absolutePath).toString();

        // convert real OS dependent path to neutral storage path
        String storagePath = StringUtils.removeStart(relativeFilePath.replace(File.separator, StoragePath.SEPARATOR),
                StoragePath.SEPARATOR);
        return paths.mapBack(StoragePath.parse(storagePath));
    }
}
