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

package com.metaphacts.junit;

import com.metaphacts.services.storage.api.ObjectKind;
import com.metaphacts.services.storage.api.ObjectStorage;
import com.metaphacts.services.storage.api.StorageException;
import com.metaphacts.ui.templates.ST;
import org.junit.rules.TemporaryFolder;

import javax.inject.Inject;
import java.io.ByteArrayInputStream;

public class PlatformStorageRule extends TemporaryFolder {
    private TestPlatformStorage platformStorage;

    @Inject
    public PlatformStorageRule(TestPlatformStorage platformStorage) {
        this.platformStorage = platformStorage;
    }

    public TestPlatformStorage getPlatformStorage() {
        return platformStorage;
    }

    public ObjectStorage getObjectStorage() {
        return platformStorage.getMainStorage();
    }

    @Override
    protected void before() throws Throwable {
        super.before();
        platformStorage.reset();
    }

    public void mockPageLayoutTemplate(String name) {
        String content = "Test Page Layout Template: '" + name + "'.";
        byte[] bytes = content.getBytes();
        try {
            getObjectStorage().appendObject(
                ST.objectIdForTemplate(name),
                getPlatformStorage().getDefaultMetadata(),
                new ByteArrayInputStream(bytes),
                bytes.length
            );
        } catch (StorageException e) {
            throw new RuntimeException(e);
        }
    }
}
