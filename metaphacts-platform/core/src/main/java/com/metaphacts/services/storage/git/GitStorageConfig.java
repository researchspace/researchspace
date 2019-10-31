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

import com.metaphacts.services.storage.api.*;

import javax.annotation.Nullable;
import java.nio.file.Path;

public class GitStorageConfig extends StorageConfig {

    private Path localPath;

    @Nullable
    private String branch;

    @Nullable
    private String remoteUrl;

    private int maxPushAttempts = 3;

    @Override
    public String getStorageType() {
        return GitStorage.STORAGE_TYPE;
    }

    @Override
    public ObjectStorage createStorage(StorageCreationParams params) throws StorageException {
        return new GitStorage(params.getPathMapping(), this);
    }

    @Override
    protected void validate() throws StorageConfigException {
        super.validate();
        if (localPath == null) {
            throw new StorageConfigException("Missing required property 'localPath'");
        }
        if (!getLocalPath().isAbsolute()) {
            throw new StorageConfigException(
                "'localPath' path must be absolute: '" + getLocalPath() + "'");
        }
        if (getMaxPushAttempts() <= 0) {
            throw new StorageConfigException("'maxPushAttempts' must be greater than zero");
        }
    }

    public Path getLocalPath() {
        return localPath;
    }

    public void setLocalPath(Path localPath) {
        this.localPath = localPath;
    }

    @Nullable
    public String getBranch() {
        return branch;
    }

    public void setBranch(@Nullable String branch) {
        this.branch = branch;
    }

    @Nullable
    public String getRemoteUrl() {
        return remoteUrl;
    }

    public void setRemoteUrl(@Nullable String remoteUrl) {
        this.remoteUrl = remoteUrl;
    }

    /**
     * Maximum count of attempts to push changes before throwing an error.
     */
    public int getMaxPushAttempts() {
        return maxPushAttempts;
    }

    public void setMaxPushAttempts(int maxPushAttempts) {
        this.maxPushAttempts = maxPushAttempts;
    }
}
