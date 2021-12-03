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

import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageCreationParams;
import org.researchspace.services.storage.api.StorageException;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class S3StorageConfig extends StorageConfig {

  private String endpoint;
  private String bucket;
  private String region;

  private String accessKeyId;
  private String secretKeyId;

  private String unResolvedAccessKeyId;
  private String unResolvedSecretKeyId;

  @Override
  public String getStorageType() {
    return S3Storage.STORAGE_TYPE;
  }

  public String getUnResolvedSecretKeyId() {
    return unResolvedSecretKeyId;
  }

  public void setUnResolvedSecretKeyId(String unResolvedSecretKeyId) {
    this.unResolvedSecretKeyId = unResolvedSecretKeyId;
  }

  public String getUnResolvedAccessKeyId() {
    return unResolvedAccessKeyId;
  }

  public void setUnResolvedAccessKeyId(String unResolvedAccessKeyId) {
    this.unResolvedAccessKeyId = unResolvedAccessKeyId;
  }

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public String getSecretKeyId() {
    return secretKeyId;
  }

  public void setSecretKeyId(String secretKeyId) {
    this.secretKeyId = secretKeyId;
  }

  public String getAccessKeyId() {
    return accessKeyId;
  }

  public void setAccessKeyId(String accessKeyId) {
    this.accessKeyId = accessKeyId;
  }

  public String getRegion() {
    return region;
  }

  public void setRegion(String region) {
    this.region = region;
  }

  public String getBucket() {
    return bucket;
  }

  public void setBucket(String bucket) {
    this.bucket = bucket;
  }

  @Override
  public ObjectStorage createStorage(StorageCreationParams params) throws StorageException {
    return new S3Storage(params.getPathMapping(), this);
  }
}
