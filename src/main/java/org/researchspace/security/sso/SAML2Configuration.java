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

import com.google.inject.Injector;

import org.researchspace.services.storage.api.PlatformStorage;

public class SAML2Configuration extends org.pac4j.saml.config.SAML2Configuration {

    public SAML2Configuration() {
        super();
    }

    public void setInjector(Injector injector) {
        var platformStorage = injector.getProvider(PlatformStorage.class).get();
        this.setKeystoreGenerator(new StorageSAML2KeystoreGenerator(this, platformStorage));
    }

    @Override
    public void setIdentityProviderMetadataPath(String path) {
        if (path != null && !path.isEmpty()) {
            super.setIdentityProviderMetadataPath(path);
        }
    }

    @Override
    public void setIdentityProviderMetadataResourceUrl(String url) {
        if (url != null && !url.isEmpty()) {
            super.setIdentityProviderMetadataResourceUrl(url);
        }
    }
}
