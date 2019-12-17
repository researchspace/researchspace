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

package com.metaphacts.repository.sparql.bearertoken;

import java.util.Map;

import org.eclipse.rdf4j.http.client.SPARQLProtocolSession;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;

import com.google.common.collect.Maps;
import com.google.inject.Inject;
import com.metaphacts.repository.sparql.MpSPARQLProtocolSession;
import com.metaphacts.secrets.SecretsHelper;
import com.metaphacts.secrets.SecretResolver;

/**
 * Implementation of a {@link SPARQLRepository} that requires a bearer token authentication.
 * The token is provided in the repository config file by means of the 
 * &lt;<http://www.metaphacts.com/ontologies/platform/repository#authenticationToken&gt; property.
 * 
 * <p>
 * The following configuration values are subject to secret resolution (see {@link SecretResolver} for details):
 * <ul>
 * <li>authenticationToken</li>
 * </ul>
 * </p>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class SPARQLBearerTokenAuthRepository extends SPARQLRepository {

    protected String authenticationToken;
    @Inject(optional=true)
    protected SecretResolver secretResolver;

    public SPARQLBearerTokenAuthRepository(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }

    public SPARQLBearerTokenAuthRepository(String endpointUrl) {
        super(endpointUrl);
    }
    
    public String getAuthenticationToken() {
        return authenticationToken;
    }

    public void setAuthenticationToken(String authenticationToken) {
        this.authenticationToken = authenticationToken;
    }
    
    @Override
    protected void initializeInternal() throws RepositoryException {
        // replace token with resolved secret (if applicable)
        setAuthenticationToken(SecretsHelper.resolveSecretOrFallback(secretResolver, getAuthenticationToken()));
        
        super.initializeInternal();
    }

    @Override
    protected SPARQLProtocolSession createHTTPClient() {
        MpSPARQLProtocolSession client = (MpSPARQLProtocolSession) super.createHTTPClient();
        
        Map<String, String> httpHeaders = Maps.newHashMap();
        httpHeaders.put("Authorization", "Bearer " + getAuthenticationToken());
        client.setAdditionalHttpHeaders(httpHeaders);

        return client;
    }

}
