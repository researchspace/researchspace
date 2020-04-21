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

package org.researchspace.services.storage.git;

import org.apache.commons.configuration2.Configuration;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageConfigException;
import org.researchspace.services.storage.api.StorageFactory;

import java.nio.file.Path;
import java.nio.file.Paths;

public class GitStorageFactory implements StorageFactory {
    @Override
    public String getStorageType() {
        return GitStorage.STORAGE_TYPE;
    }

    @Override
    public StorageConfig parseStorageConfig(String storageType, Configuration properties)
            throws StorageConfigException {
        GitStorageConfig config = new GitStorageConfig();
        StorageConfig.readBaseProperties(config, properties);
        if (properties.containsKey("localPath")) {
            Path localPath = Paths.get(properties.getString("localPath"));
            config.setLocalPath(localPath);
        }
        if (properties.containsKey("branch")) {
            config.setBranch(properties.getString("branch"));
        }
        if (properties.containsKey("remoteUrl")) {
            config.setRemoteUrl(properties.getString("remoteUrl"));
        }
        if (properties.containsKey("maxPushAttempts")) {
            config.setMaxPushAttempts(properties.getInt("maxPushAttempts"));
        }
        return config;
    }
}
