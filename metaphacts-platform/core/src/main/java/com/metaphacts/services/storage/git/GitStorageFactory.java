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

package com.metaphacts.services.storage.git;

import com.metaphacts.services.storage.api.StorageConfig;
import com.metaphacts.services.storage.api.StorageConfigException;
import com.metaphacts.services.storage.api.StorageFactory;
import org.apache.commons.configuration2.Configuration;

import java.nio.file.Path;
import java.nio.file.Paths;

public class GitStorageFactory implements StorageFactory {
    @Override
    public String getStorageType() {
        return GitStorage.STORAGE_TYPE;
    }

    @Override
    public StorageConfig parseStorageConfig(
        String storageType,
        Configuration properties
    ) throws StorageConfigException {
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
