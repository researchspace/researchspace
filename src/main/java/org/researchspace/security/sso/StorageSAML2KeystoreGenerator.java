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
package org.researchspace.security.sso;

import java.io.InputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

import org.apache.commons.io.output.ByteArrayOutputStream;
import org.opensaml.saml.common.SAMLException;
import org.pac4j.saml.metadata.keystore.BaseSAML2KeystoreGenerator;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StoragePath;

public class StorageSAML2KeystoreGenerator extends BaseSAML2KeystoreGenerator {

    private final PlatformStorage platformStorage;

    public StorageSAML2KeystoreGenerator(final SAML2Configuration saml2Configuration, PlatformStorage platformStorage) {
        super(saml2Configuration);
        this.platformStorage = platformStorage;
    }

    @Override
    public boolean shouldGenerate() {
        StoragePath objectId = ObjectKind.CONFIG.resolve("saml2Keystore.jks");
        try {
            var maybeKeystore = this.platformStorage
                .getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY)
                .getObject(objectId, null);

            return maybeKeystore.isEmpty() || super.shouldGenerate();
        } catch (StorageException e) {
            throw new RuntimeException("Can't retrieve keystore from runtime storage.");
        }
    }

    @Override
    public InputStream retrieve() throws Exception {
        StoragePath objectId = ObjectKind.CONFIG.resolve("saml2Keystore.jks");
        final var maybeKeystore = this.platformStorage
            .getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY)
            .getObject(objectId, null);
        if (maybeKeystore.isPresent()) {
            return maybeKeystore.get().getLocation().readContent();
        } else {
            throw new SAMLException("Can't retrieve keystore from runtime storage.");
        }
    }

    @Override
    protected void store(KeyStore ks, X509Certificate certificate, PrivateKey privateKey) throws Exception {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            final char[] password = saml2Configuration.getKeystorePassword().toCharArray();
            ks.store(out, password);
            out.flush();

            StoragePath objectId = ObjectKind.CONFIG.resolve("saml2Keystore.jks");
            final var storage = this.platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY);
            storage.appendObject(objectId, new ObjectMetadata(null, null), out.toInputStream(), out.size());
        }
    }
}
