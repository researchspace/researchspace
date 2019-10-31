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

package com.metaphacts.services.storage.api;

import javax.annotation.Nullable;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * Represents an abstract storage of so-called objects which are BLOBs indexed by {@link ObjectKind}
 * and string IDs and have metadata associated with each one.
 */
public interface ObjectStorage {
    /**
     * @return {@code true} if it's possible to modify storage data through mutation methods
     * {@link #appendObject}, {@link #deleteObject}, etc; {@code false} if storage is read-only
     */
    boolean isMutable();

    /**
     * Fetches an object record for specified kind, ID and (optionally) revision.
     *
     * @param path target object path
     * @param revision object revision to return or latest if {@code null}
     * @return object record with metadata and ability to retrieve the data
     * @throws StorageException if fetching operation failed
     */
    Optional<ObjectRecord> getObject(
        StoragePath path,
        @Nullable String revision
    ) throws StorageException;

    /**
     * Fetches records for all revisions of objects with specified kind and ID.
     *
     * @param path kind target object path
     * @return object records with metadata and ability to retrieve the data
     * @throws StorageException if fetching operation failed
     */
    List<ObjectRecord> getRevisions(StoragePath path) throws StorageException;

    /**
     * Fetches records for objects with specified kind which matches specified path prefix.
     *
     * @param prefix target prefix to match at start of full object path
     * @return object records with metadata and ability to retrieve the data
     * @throws StorageException if fetching operation failed
     */
    List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException;

    /**
     * Either:
     *  - adds new object if it doesn't exists yet;
     *  - adds new revision to existing object;
     *  - replaces current object revision if storage doesn't support versioning.
     *
     * @param path target object path
     * @param metadata metadata of this revision of object
     * @param content new object revision content; automatically closed in
     *                either case of successful or failed operation
     * @param contentLength must be equal to content size in bytes
     * @return new object revision metadata
     * @throws StorageException if appending operation failed
     */
    ObjectRecord appendObject(
        StoragePath path,
        ObjectMetadata metadata,
        InputStream content,
        long contentLength
    ) throws StorageException;

    /**
     * Deletes the specified object from storage.
     * Should not throw an exception if object doesn't exists.
     *
     * @param path target object path
     * @param metadata metadata of (internal) deleted revision
     *
     * @throws StorageException if object exists but deleting operation failed
     */
    void deleteObject(
        StoragePath path,
        ObjectMetadata metadata
    ) throws StorageException;
}
