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

import org.apache.commons.configuration2.Configuration;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageConfigException;
import org.researchspace.services.storage.api.StorageFactory;

public class S3StorageFactory implements StorageFactory {

    @Override
    public String getStorageType() {
        return S3Storage.STORAGE_TYPE;
    }

    @Override
    public StorageConfig parseStorageConfig(String storageType, Configuration properties)
            throws StorageConfigException {
        S3StorageConfig config = new S3StorageConfig();
        StorageConfig.readBaseProperties(config, properties);
        
        // Add here the cusom properties
        // region, accesskey, endpoint, role etc.
        // https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/creating-clients.html

        return config;
    }
    
}
