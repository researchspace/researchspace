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

import io.github.classgraph.ClassGraph;
import io.github.classgraph.Resource;
import io.github.classgraph.ScanResult;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import javax.annotation.Nullable;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.services.storage.api.*;

import com.google.common.collect.ImmutableList;

public class ClassPathStorage implements ObjectStorage {
    private static final Logger logger = LogManager.getLogger(ClassPathStorage.class);

    public final static String STORAGE_TYPE = "classpath";
    private static final String FIXED_REVISION = "";

    private final PathMapping paths;
    private final ClassLoader classLoader;
    private final Config config;

    public ClassPathStorage(PathMapping paths, ClassLoader classLoader, Config config) {
        this.paths = paths;
        this.classLoader = classLoader;
        this.config = config;
    }

    public static class Config extends StorageConfig {
        private String classpathLocation;

        public Config() {
        }

        public Config(String classpathLocation) {
            this.classpathLocation = classpathLocation;
        }

        @Override
        public String getStorageType() {
            return STORAGE_TYPE;
        }

        public String getClasspathLocation() {
            return classpathLocation;
        }

        public void setClasspathLocation(String classpathLocation) {
            this.classpathLocation = classpathLocation;
        }

        @Override
        public ClassPathStorage createStorage(StorageCreationParams params) {
            return new ClassPathStorage(params.getPathMapping(), params.getClassLoader(), this);
        }

        @Override
        protected void validate() throws StorageConfigException {
            super.validate();
            if (getClasspathLocation() == null) {
                throw new StorageConfigException("Missing required property 'classpathLocation'");
            }
            try {
                StoragePath.parse(getClasspathLocation());
            } catch (Exception e) {
                throw new StorageConfigException("Invalid value for 'classpathLocation' property", e);
            }
        }
    }

    private class ClassPathStorageLocation implements StorageLocation {
        private URL classPathLocation;

        public ClassPathStorageLocation(URL classPathLocation) {
            this.classPathLocation = classPathLocation;
        }

        @Override
        public ObjectStorage getStorage() {
            return ClassPathStorage.this;
        }

        @Override
        public InputStream readContent() throws IOException {
            return classPathLocation.openStream();
        }

        @Override
        public SizedStream readSizedContent() throws IOException {
            URLConnection connection = classPathLocation.openConnection();
            long contentLength = connection.getContentLength();
            return new SizedStream(connection.getInputStream(), contentLength);
        }
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Optional<ObjectRecord> getObject(StoragePath path, @Nullable String revision) throws StorageException {
        if (revision != null && !revision.equals(FIXED_REVISION)) {
            return Optional.empty();
        }

        Optional<String> resourcePath = getObjectResourcePath(path);
        if (!resourcePath.isPresent()) {
            return Optional.empty();
        }

        URL resource = classLoader.getResource(resourcePath.get());
        if (resource == null) {
            return Optional.empty();
        }

        StorageLocation key = new ClassPathStorageLocation(resource);
        return Optional.of(new ObjectRecord(key, path, FIXED_REVISION, ObjectMetadata.empty()));
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        return getObject(path, null).map(ImmutableList::of).orElse(ImmutableList.of());
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        Optional<StoragePath> mappedPrefix = paths.mapForward(prefix);
        if (!mappedPrefix.isPresent()) {
            return ImmutableList.of();
        }

        StoragePath basePrefix = StoragePath.parse(config.getClasspathLocation());
        StoragePath fullPrefix = basePrefix.resolve(mappedPrefix.get());

        String packageToSearch = resourceFolderPathToPackageName(fullPrefix);
        ClassGraph classGraph = new ClassGraph().addClassLoader(classLoader).whitelistPackages(packageToSearch);

        List<StoragePath> objectIds = new ArrayList<>();
        try (ScanResult scanResult = classGraph.scan()) {
            for (Resource resource : scanResult.getAllResources()) {
                // returns something like "org/researchspace/etc/Foo.ext"
                String absolutePath = resource.getPath();
                basePrefix.relativize(StoragePath.EMPTY.resolve(absolutePath)).flatMap(paths::mapBack)
                        .ifPresent(path -> {
                            objectIds.add(path);
                        });
            }
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
        throw new StorageException("appendObject is not supported by ClassPathStorage");
    }

    @Override
    public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
        throw new StorageException("deleteObject is not supported by ClassPathStorage");
    }

    private Optional<String> getObjectResourcePath(StoragePath path) {
        return paths.mapForward(path).map(mappedPath -> config.getClasspathLocation() + "/" + mappedPath);
    }

    private static String resourceFolderPathToPackageName(StoragePath resourcePath) {
        return resourcePath.toString().replace(StoragePath.SEPARATOR, ".");
    }
}
