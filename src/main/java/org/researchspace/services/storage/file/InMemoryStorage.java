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

import com.google.common.collect.ImmutableList;

import org.apache.commons.io.IOUtils;
import org.researchspace.services.storage.api.*;

import javax.annotation.Nullable;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Thread-safe in-memory object storage implementation.
 */
public class InMemoryStorage implements ObjectStorage {
    private final Map<StoragePath, Record> records = new HashMap<>();

    private static class Record {
        public final StoragePath path;
        public final SortedMap<Integer, ObjectRevision> revisions = new TreeMap<>();

        public Record(StoragePath path) {
            this.path = path;
        }
    }

    private static class ObjectRevision {
        public final int key;
        public final ObjectMetadata metadata;
        public final byte[] content;

        public ObjectRevision(int key, ObjectMetadata metadata, byte[] content) {
            this.key = key;
            this.metadata = metadata;
            this.content = content;
        }

        public static int parseKey(String revisionKey) {
            try {
                return Integer.parseInt(revisionKey);
            } catch (NumberFormatException e) {
                return -1;
            }
        }
    }

    private class InMemoryLocation implements StorageLocation {
        private final ObjectRevision revision;

        public InMemoryLocation(ObjectRevision revision) {
            this.revision = revision;
        }

        @Override
        public ObjectStorage getStorage() {
            return InMemoryStorage.this;
        }

        @Override
        public InputStream readContent() throws IOException {
            return new ByteArrayInputStream(revision.content);
        }

        @Override
        public SizedStream readSizedContent() throws IOException {
            return new SizedStream(new ByteArrayInputStream(revision.content), revision.content.length);
        }
    }

    @Override
    public boolean isMutable() {
        return true;
    }

    @Override
    public Optional<ObjectRecord> getObject(StoragePath path, @Nullable String revision) throws StorageException {
        Record foundRecord;
        synchronized (records) {
            foundRecord = records.get(path);
        }
        return Optional.ofNullable(foundRecord).flatMap(record -> {
            synchronized (record) {
                return Optional.ofNullable(revision == null ? record.revisions.get(record.revisions.lastKey())
                        : record.revisions.get(ObjectRevision.parseKey(revision)));
            }
        }).map(rev -> new ObjectRecord(new InMemoryLocation(rev), path, String.valueOf(rev.key), rev.metadata));
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        Record record;
        synchronized (records) {
            record = records.get(path);
        }
        if (record == null) {
            return ImmutableList.of();
        }
        synchronized (record) {
            return record.revisions.values().stream().map(revision -> new ObjectRecord(new InMemoryLocation(revision),
                    path, String.valueOf(revision.key), revision.metadata)).collect(Collectors.toList());
        }
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        List<Record> found;
        synchronized (records) {
            found = records.values().stream().filter(record -> prefix.isPrefixOf(record.path))
                    .collect(Collectors.toList());
        }
        List<ObjectRecord> result = new ArrayList<>();
        for (Record record : found) {
            getObject(record.path, null).ifPresent(result::add);
        }
        return result;
    }

    @Override
    public ObjectRecord appendObject(StoragePath path, ObjectMetadata metadata, InputStream content, long contentLength)
            throws StorageException {
        Record record;
        synchronized (records) {
            record = records.get(path);
            if (record == null) {
                record = new Record(path);
                records.put(record.path, record);
            }
        }

        byte[] contentAsBytes;
        try {
            contentAsBytes = IOUtils.toByteArray(content);
        } catch (IOException e) {
            throw new StorageException(e);
        }

        ObjectRevision revision;
        synchronized (record) {
            int revisionKey = record.revisions.size();
            revision = new ObjectRevision(revisionKey, metadata.withCurrentDate(), contentAsBytes);
            record.revisions.put(revisionKey, revision);
        }
        return new org.researchspace.services.storage.api.ObjectRecord(new InMemoryLocation(revision), record.path,
                String.valueOf(revision.key), revision.metadata);
    }

    @Override
    public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
        synchronized (records) {
            records.remove(path);
        }
    }
}
