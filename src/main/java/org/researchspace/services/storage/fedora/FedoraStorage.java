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

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.List;
import java.util.Optional;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import com.google.common.collect.Lists;

import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.SizedStream;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StorageLocation;
import org.researchspace.services.storage.api.StoragePath;

/**
 * Basic storage implementation for Fedora Commons Repository
 * (https://duraspace.org/fedora/).
 *
 * Currently we only upload binaries, without any additional RDF.
 */
public class FedoraStorage implements ObjectStorage {

    public static final String STORAGE_TYPE = "fedora";

    private FedoraStorageConfig config;

    // TODO we need to configure client properly
    // see http://www.theotherian.com/2013/08/jersey-client-2.0-httpclient-timeouts-max-connections.html
    private final Client client = ClientBuilder.newClient();

    public FedoraStorage(FedoraStorageConfig config) {
        this.config = config;
    }

    private class FedoraStorageLocation implements StorageLocation {

        private URI resourceUri;

        public FedoraStorageLocation(URI resourceUri) {
            this.resourceUri = resourceUri;
        }

        @Override
        public ObjectStorage getStorage() {
            return FedoraStorage.this;
        }

        @Override
        public SizedStream readSizedContent() throws IOException {
            Response resp = client.target(this.resourceUri).request().get();
            return new SizedStream(resp.readEntity(InputStream.class), resp.getLength());
        }
    }

    @Override
    public boolean isMutable() {
        return this.config.isMutable();
    }

    @Override
    public Optional<ObjectRecord> getObject(StoragePath path, String revision) throws StorageException {

        URI resourceUri = this.createResourceUri(path);
        try(Response resp = this.client.target(resourceUri).request().head()) {
            if (Status.OK.getStatusCode() == resp.getStatus()) {
                StorageLocation location = new FedoraStorageLocation(resourceUri);
                return Optional.of(new ObjectRecord(location, path, "", ObjectMetadata.empty()));
            }
        }
        return Optional.empty();
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        return this.getObject(path, null).map(Lists::newArrayList).orElse(Lists.newArrayList());
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        return Lists.newArrayList();
    }

    @Override
    public ObjectRecord appendObject(StoragePath path, ObjectMetadata metadata, InputStream content, long contentLength)
            throws StorageException {
        Response resp = client.target(this.createResourceUri(path)).request()
            .header("Link", "<http://www.w3.org/ns/ldp#NonRDFSource>; rel=\"type\"")
            // currently we store all files as binary blobs
            .put(Entity.entity(content, MediaType.APPLICATION_OCTET_STREAM_TYPE));
        resp.close();
        return null;
    }

    @Override
    public void deleteObject(StoragePath path, ObjectMetadata metadata) throws StorageException {
        Response resp = client.target(this.createResourceUri(path)).request().delete();
        resp.close();
    }

    private URI createResourceUri(StoragePath path) {
        return this.config.getContainerUri().resolve(path.getLastComponent());
    }

    @Override
    public void close() throws Exception {
        this.client.close();
    }
}
