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

import org.researchspace.services.storage.api.*;

/**
 * Fedora Commons Repository storage configuration.
 */
public class FedoraStorageConfig extends StorageConfig {

    /**
     * Fedora LDP container that should be used as a file storage.
     * The URI should be resolvable URL.
     */
    private URI containerURI;

    @Override
    public String getStorageType() {
        return FedoraStorage.STORAGE_TYPE;
    }

    @Override
    public ObjectStorage createStorage(StorageCreationParams params) throws StorageException {
        return new FedoraStorage(this);
    }

    public URI getContainerUri() {
        return containerURI;
    }

    public void setContainerUri(URI containerURI) {
        this.containerURI = containerURI;
    }
}
