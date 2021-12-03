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

import org.apache.commons.configuration2.Configuration;
import org.researchspace.services.storage.api.StorageConfig;
import org.researchspace.services.storage.api.StorageConfigException;
import org.researchspace.services.storage.api.StorageFactory;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class S3StorageFactory implements StorageFactory {

  private static final String ENDPOINT = "endpoint";
  private static final String REGION = "region";
  private static final String BUCKET = "bucket";

  private static final String ACCESS_KEY = "access-key";
  private static final String SECRET_KEY = "secret-key";

  @Override
  public String getStorageType() {
    return S3Storage.STORAGE_TYPE;
  }

  @Override
  public StorageConfig parseStorageConfig(String storageType, Configuration properties)
      throws StorageConfigException {
    S3StorageConfig config = new S3StorageConfig();
    StorageConfig.readBaseProperties(config, properties);

    if (properties.containsKey(ENDPOINT))
      config.setEndpoint(properties.getString(ENDPOINT));

    if (properties.containsKey(REGION))
      config.setRegion(properties.getString(REGION));

    if (properties.containsKey(BUCKET))
      config.setBucket(properties.getString(BUCKET));

    if (properties.containsKey(ACCESS_KEY))
      config.setAccessKeyId(properties.getString(ACCESS_KEY));

    if (properties.containsKey(SECRET_KEY))
      config.setSecretKeyId(properties.getString(SECRET_KEY));

    return config;
  }
}