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

package org.researchspace.repository.sparql;

import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsHelper;

import com.google.inject.Inject;

/**
 * SPARQL Repository with authentication (HTTP basic auth or HTTP digest auth).
 * 
 * <p>
 * The following configuration values are subject to secret resolution (see
 * {@link SecretResolver} for details):
 * <ul>
 * <li>username</li>
 * <li>password</li>
 * </ul>
 * </p>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class SPARQLAuthenticatingRepository extends CustomSPARQLRepository {
    private enum AuthMethod {
        None, BasicAuth, DigestAuth
    };

    private AuthMethod authenticationModus = AuthMethod.None;

    // realm value for digest auth
    private String realm;

    private String username;

    private String password;

    @Inject(optional = true)
    private SecretResolver secretResolver;

    /**
     * @param endpointUrl
     */
    public SPARQLAuthenticatingRepository(String endpointUrl) {
        super(endpointUrl);
    }

    public SPARQLAuthenticatingRepository(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }

    public void setBasicAuthCredentials(String username, String password) {
        this.username = username;
        this.password = password;
        this.authenticationModus = AuthMethod.BasicAuth;
    }

    public void setDigestAuthCredentials(String username, String password, String realm) {
        this.username = username;
        this.password = password;
        this.realm = realm;
        this.authenticationModus = AuthMethod.DigestAuth;
    }

    @Override
    protected void initializeInternal() throws RepositoryException {
        // replace username, password, and realm with resolved secrets (if applicable)
        username = SecretsHelper.resolveSecretOrFallback(secretResolver, username);
        password = SecretsHelper.resolveSecretOrFallback(secretResolver, password);
        realm = SecretsHelper.resolveSecretOrFallback(secretResolver, realm);

        super.initializeInternal();
    }

    @Override
    protected MpSPARQLProtocolSession createHTTPClient() {
        if (authenticationModus.equals(AuthMethod.BasicAuth)) {
            // when setting this on the super class
            // createHTTPClient will create a client with basic auth context
            super.setUsernameAndPassword(username, password);
        }
        MpSPARQLProtocolSession client = (MpSPARQLProtocolSession) super.createHTTPClient();
        if (authenticationModus.equals(AuthMethod.DigestAuth)) {
            client.setDigestAuthCredentials(username, password, this.realm);
        }

        return client;
    }

}
