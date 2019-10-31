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

package com.metaphacts.repository.sparql;

import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SPARQLAuthenticatingRepository extends SPARQLRepository {
    private enum AuthMethod { None, BasicAuth, DigestAuth};
    
    private AuthMethod authenticationModus = AuthMethod.None;
    
    // realm value for digest auth
    private String realm;
    
    private String username;
    
    private String password;
    
    /**
     * @param endpointUrl
     */
    public SPARQLAuthenticatingRepository(String endpointUrl) {
        super(endpointUrl);
    }
    
    public SPARQLAuthenticatingRepository(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }
    
    public void setBasicAuthCredentials(String username, String password){
        this.username = username;
        this.password = password;
        this.authenticationModus = AuthMethod.BasicAuth;
    }

    public void setDigestAuthCredentials(String username, String password, String realm){
        this.username = username;
        this.password = password;
        this.realm = realm;
        this.authenticationModus = AuthMethod.DigestAuth;
    }
    
    @Override
    protected MpSPARQLProtocolSession createHTTPClient() {
        if(authenticationModus.equals(AuthMethod.BasicAuth)){
            // when setting this on the super class
            // createHTTPClient will create a client with basic auth context
            super.setUsernameAndPassword(username, password);
        }
        MpSPARQLProtocolSession client = (MpSPARQLProtocolSession) super.createHTTPClient();
        if(authenticationModus.equals(AuthMethod.DigestAuth)){
            client.setDigestAuthCredentials(username, password, this.realm);
        }
        
        return client;
    }

}
