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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import com.amazonaws.SdkClientException;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import com.google.inject.Inject;
import com.google.inject.Provider;

import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsHelper;
import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PathMapping;
import org.researchspace.services.storage.api.SizedStream;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StorageLocation;
import org.researchspace.services.storage.api.StoragePath;
import org.apache.commons.lang3.StringUtils;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class S3Storage implements ObjectStorage {

  protected final class S3StorageLocation implements StorageLocation {

    private String bucket;
    private String key;

    public S3StorageLocation(String bucket, String key) {
      this.bucket = bucket;
      this.key = key;
    }

    @Override
    public ObjectStorage getStorage() {
      return S3Storage.this;
    }

    @Override
    public SizedStream readSizedContent() throws IOException {
      S3Object object = s3.getObject(config.getBucket(), key);
      return new SizedStream((InputStream) object.getObjectContent(),
          object.getObjectMetadata().getContentLength());
    }

  }

  @Inject
  private Provider<SecretResolver> secretResolver;

  public static final String AUTHOR_KEY = "Author";
  public static final String STORAGE_TYPE = "s3";
  public final PathMapping paths;
  public final S3StorageConfig config;

  private AmazonS3 s3;

  public S3Storage(PathMapping paths, S3StorageConfig config) throws StorageException {
    this.paths = paths;
    this.config = config;

    initialize();
  }

  private void resolveSecrets(S3StorageConfig config) {
    if (config.getUnResolvedAccessKeyId() != null && config.getUnResolvedSecretKeyId() != null) {
      String accessKeyId = SecretsHelper.resolveSecretOrFallback(secretResolver.get(),
          config.getUnResolvedAccessKeyId());
      config.setAccessKeyId(accessKeyId);

      String secretKeyId = SecretsHelper.resolveSecretOrFallback(secretResolver.get(),
          config.getUnResolvedSecretKeyId());
      config.setSecretKeyId(secretKeyId);
    }
  }

  private void initialize() throws StorageException {
    this.resolveSecrets(config);

    // Without access-key or secret-key throw exception
    if (config.getAccessKeyId() != null && config.getSecretKeyId() != null) {

      BasicAWSCredentials awsCreds = new BasicAWSCredentials(config.getAccessKeyId(), config.getSecretKeyId());

      // Without endpoint or region create a basic s3 storage otherwise create custom
      // endpoint configuration
      if (config.getEndpoint() != null && config.getRegion() != null) {
        this.s3 = AmazonS3ClientBuilder.standard()
            .withEndpointConfiguration(
                new AwsClientBuilder.EndpointConfiguration(config.getEndpoint(), config.getRegion()))
            .withCredentials(new AWSStaticCredentialsProvider(awsCreds)).build();
      } else {
        this.s3 = AmazonS3ClientBuilder.standard().withCredentials(new AWSStaticCredentialsProvider(awsCreds))
            .build();
      }

    } else {
      throw new StorageException("Access KEY ID or Secret KEY ID not found");
    }

  }

  @Override
  public boolean isMutable() {
    return config.isMutable();
  }

  @Override
  public Optional<ObjectRecord> getObject(StoragePath path, String revision) throws StorageException {

    try {

      String key = getKeyFromStoragePath(path);

      com.amazonaws.services.s3.model.ObjectMetadata s3Metadata = s3.getObjectMetadata(config.getBucket(), key);

      // If metadata exist
      String user = s3Metadata.getUserMetaDataOf(AUTHOR_KEY);
      S3StorageLocation location = new S3StorageLocation(config.getBucket(), key);
      ObjectMetadata metadata = new ObjectMetadata(Objects.isNull(user) ? "" : user,
          s3Metadata.getLastModified().toInstant());

      return Optional.of(new ObjectRecord(location, path, revision, metadata));
    } catch (AmazonS3Exception e) {
      // If the key is missing, return an empty result
      if (StringUtils.equals(e.getErrorCode(), "NoSuchKey")
          || StringUtils.equals(e.getErrorCode(), "404 Not Found"))
        return Optional.empty();
      throw new StorageException(e.getMessage());
    } catch (Exception e) {
      throw new StorageException(e.getMessage());
    }

  }

  @Override
  public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
    // TODO Auto-generated method stub
    return null;
  }

  @Override
  public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {

    Optional<StoragePath> mappedPrefix = paths.mapForward(prefix);

    if (!mappedPrefix.isPresent()) {
      throw new StorageException("");
    }

    String pref = mappedPrefix.get().toString();

    try {

      ListObjectsV2Result result = s3.listObjectsV2(config.getBucket(), pref);
      List<ObjectRecord> records = new ArrayList<>();

      List<S3ObjectSummary> objects = result.getObjectSummaries();
      for (S3ObjectSummary os : objects) {

        Optional<StoragePath> path = StoragePath.tryParse(os.getKey()).flatMap(paths::mapBack);

        if (path.isPresent()) {
          Optional<ObjectRecord> objectRecord = getObject(path.get(), null);
          if (objectRecord.isPresent()) {
            records.add(objectRecord.get());
          }
        }

      }

      return records;

    } catch (Exception e) {

      throw new StorageException(e.getMessage());
    }
  }

  @Override
  public ObjectRecord appendObject(StoragePath path, ObjectMetadata metadata, InputStream content, long contentLength)
      throws StorageException {

    try {
      ObjectRecord objectRecord;

      String key = getKeyFromStoragePath(path);

      S3StorageLocation location = new S3StorageLocation(config.getBucket(), key);

      // TODO: calculate revision
      objectRecord = new ObjectRecord(location, path, "", metadata);
      com.amazonaws.services.s3.model.ObjectMetadata s3Metadata = new com.amazonaws.services.s3.model.ObjectMetadata();
      s3Metadata.addUserMetadata(AUTHOR_KEY, metadata.getAuthor());

      // TODO: check PutObjectResult
      s3.putObject(config.getBucket(), key, content, s3Metadata);

      return objectRecord;

    } catch (SdkClientException e) {
      throw new StorageException(e.getMessage());
    } catch (Exception e) {
      throw new StorageException(e.getMessage());
    }
  }

  @Override
  public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
    try {
      String key = getKeyFromStoragePath(path);

      s3.deleteObject(config.getBucket(), key);

    } catch (Exception e) {
      throw new StorageException(e.getMessage());
    }
  }

  /**
   * 
   * @param path
   * @return
   * @throws StorageException
   */
  private String getKeyFromStoragePath(StoragePath path) throws StorageException {

    Optional<String> key = this.paths.mapForward(path).map(StoragePath::toString);

    if (!key.isPresent())
      throw new StorageException("Error, the object key is not present");

    return key.get();
  }
}