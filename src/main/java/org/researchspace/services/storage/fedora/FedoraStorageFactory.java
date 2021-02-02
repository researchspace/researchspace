/**
 * ResearchSpace Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.services.storage.fedora;

import java.net.URI;

import org.apache.commons.configuration2.Configuration;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageConfigException;
import org.researchspace.services.storage.api.StorageFactory;

/**
 * Storage factory for Fedora Commons Repository.
 *
 * It is loaded through default Java service mechanism, see src/main/resources/META-INF/services/org.researchspace.services.storage.api.StorageFactory
 */
public class FedoraStorageFactory implements StorageFactory {

    @Override
    public String getStorageType() {
        return FedoraStorage.STORAGE_TYPE;
    }

    @Override
    public StorageConfig parseStorageConfig(String storageType, Configuration properties)
            throws StorageConfigException {
        FedoraStorageConfig config = new FedoraStorageConfig();
        StorageConfig.readBaseProperties(config, properties);
        try {
          config.setContainerUri(new URI(properties.getString("containerUri")));
        } catch (Exception e) {
            throw new StorageConfigException(e);
        }
        return config;
    }
}
