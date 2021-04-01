/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.services.storage.s3;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StoragePath;

public class S3Storage implements ObjectStorage {

    public static final String STORAGE_TYPE = "s3";

    @Override
    public boolean isMutable() {
        // TODO Auto-generated method stub
        return false;
    }

    @Override
    public Optional<ObjectRecord> getObject(StoragePath path, String revision) throws StorageException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public ObjectRecord appendObject(StoragePath path, ObjectMetadata metadata, InputStream content, long contentLength)
            throws StorageException {
        // TODO Auto-generated method stub
        return null;
    }

    @Override
    public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
        // TODO Auto-generated method stub
        
    }
    
}
