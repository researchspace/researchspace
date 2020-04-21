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

import javax.annotation.Nullable;

import org.researchspace.services.storage.api.*;

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
            throw new StorageConfigException("'localPath' path must be absolute: '" + getLocalPath() + "'");
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
