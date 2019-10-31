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

package com.metaphacts.services.storage.file;

import com.metaphacts.services.storage.api.*;
import org.apache.commons.configuration2.Configuration;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class ClassPathStorageFactory implements StorageFactory {
    @Override
    public String getStorageType() {
        return ClassPathStorage.STORAGE_TYPE;
    }

    @Override
    public StorageConfig parseStorageConfig(
        String storageType,
        Configuration properties
    ) throws StorageConfigException {
        ClassPathStorage.Config config = new ClassPathStorage.Config();
        StorageConfig.readBaseProperties(config, properties);
        if (properties.containsKey("classpathLocation")) {
            config.setClasspathLocation(properties.getString("classpathLocation"));
        }
        return config;
    }
}
