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

package org.researchspace.junit;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;

import javax.validation.constraints.NotNull;

import org.researchspace.services.storage.api.*;
import org.researchspace.services.storage.file.InMemoryStorage;

import java.util.*;

public class TestPlatformStorage implements PlatformStorage {
    public static final String STORAGE_ID = PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY;

    private final PathMapping paths = new PathMapping.Default();

    private Map<String, ObjectStorage> storages = new HashMap<>();
    private List<String> searchOrder;

    public TestPlatformStorage() {
        storages.put(STORAGE_ID, new InMemoryStorage());
        searchOrder = ImmutableList.of(STORAGE_ID);
    }

    public ObjectStorage getMainStorage() {
        return storages.get(STORAGE_ID);
    }

    public void reset() {
        storages.put(STORAGE_ID, new InMemoryStorage());
    }

    @Override
    public PathMapping getPathMapping() {
        return paths;
    }

    @Override
    public ObjectMetadata getDefaultMetadata() {
        return new ObjectMetadata(null, null);
    }

    @Override
    public Optional<PlatformStorage.FindResult> findObject(StoragePath path) throws StorageException {
        for (String appId : searchOrder) {
            ObjectStorage storage = storages.get(appId);
            Optional<ObjectRecord> record = storage.getObject(path, null);
            if (record.isPresent()) {
                return Optional.of(new PlatformStorage.FindResult(appId, record.get()));
            }
        }
        return Optional.empty();
    }

    @Override
    public Map<StoragePath, PlatformStorage.FindResult> findAll(StoragePath prefix) throws StorageException {
        Map<StoragePath, PlatformStorage.FindResult> results = new HashMap<>();
        for (String appId : searchOrder) {
            ObjectStorage storage = storages.get(appId);
            storage.getAllObjects(prefix).forEach(record -> {
                results.put(record.getPath(), new PlatformStorage.FindResult(appId, record));
            });
        }
        return results;
    }

    @Override
    public List<FindResult> findOverrides(StoragePath path) throws StorageException {
        List<FindResult> overrides = new ArrayList<>();
        for (String appId : searchOrder) {
            ObjectStorage storage = storages.get(appId);
            storage.getObject(path, null).ifPresent(record -> {
                overrides.add(new PlatformStorage.FindResult(appId, record));
            });
        }
        return overrides;
    }

    @NotNull
    @Override
    public ObjectStorage getStorage(String appId) {
        ObjectStorage storage = storages.get(appId);
        if (storage == null) {
            throw new RuntimeException("Cannot get storage for unknown appId = \"" + appId + "\"");
        }
        return storage;
    }

    @Override
    public List<String> getOverrideOrder() {
        return Lists.reverse(searchOrder);
    }

    @Override
    public List<PlatformStorage.StorageStatus> getStorageStatusFor(StoragePath prefix) {
        return ImmutableList.of(new PlatformStorage.StorageStatus(STORAGE_ID, true));
    }
}
