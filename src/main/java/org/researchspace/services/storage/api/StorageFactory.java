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

package org.researchspace.services.storage.api;

import org.apache.commons.configuration2.Configuration;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public interface StorageFactory {
    /**
     * Unique key to identify the type of a storage, which can be instantiated via
     * the factory. The service loader will populate the {@link StorageRegistry}
     * with all types and respective factories.
     */
    String getStorageType();

    /**
     * Creates a {@link StorageConfig} from a Apache Commons {@link Configuration}
     * object, i.e. any abstraction over configurations.
     */
    StorageConfig parseStorageConfig(String storageType, Configuration properties) throws StorageConfigException;

    /**
     * Instantiates a storage with the respective {@link StorageConfig} and
     * {@link StorageCreationParams}.
     */
    default ObjectStorage makeStorage(StorageConfig config, StorageCreationParams creationParams)
            throws StorageException {
        return config.createStorage(creationParams);
    }
}
