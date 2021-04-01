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

import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageCreationParams;
import org.researchspace.services.storage.api.StorageException;

public class S3StorageConfig extends StorageConfig{

    @Override
    public String getStorageType() {
        return S3Storage.STORAGE_TYPE;
    }

    @Override
    public ObjectStorage createStorage(StorageCreationParams params) throws StorageException {
        // TODO Auto-generated method stub
        return null;
    }
    
}
