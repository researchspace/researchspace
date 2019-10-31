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

package com.metaphacts.repository;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;

import com.metaphacts.junit.TestUtils;
import com.metaphacts.repository.sparql.SPARQLBasicAuthRepositoryConfig;
import com.metaphacts.repository.sparql.SPARQLDigestAuthRepositoryConfig;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SPARQLDigestAuthRepositoryConfigTest {
    ValueFactory vf = SimpleValueFactory.getInstance();
    private final IRI baseIri =  vf.createIRI("http://www.metaphacts.com/base");
    private final String DIGEST_AUTH_CONFIG_FILE = "/com/metaphacts/repository/test-sparql-digest-auth-repository.ttl";

    @Rule
    public TemporaryFolder tempFolder = new TemporaryFolder();
    
    @Rule
    public ExpectedException exception = ExpectedException.none();
    private String sparqlRepositoryUrl = "http://wikidata.metaphacts.com/sparql";
    private String sparqlRepositoryUpdateUrl = "http://wikidata.metaphacts.com/sparql/update";
    
    @Test
    public void testNoUser() throws Exception{
       RepositoryConfig config = createSparqlDigestAuthConfig(null, "testpassword", "testrealm");
       exception.expect(RepositoryConfigException.class);
       exception.expectMessage("No username specified for SPARQL authenticating repository.");
       config.validate();
    }

    @Test
    public void testNoPassword() throws Exception{
        RepositoryConfig config = createSparqlDigestAuthConfig("testuser", null, "testrealm");
        exception.expect(RepositoryConfigException.class);
        exception.expectMessage("No password specified for SPARQL authenticating repository.");
        config.validate();
    }

    @Test
    public void testNoRealm() throws Exception{
        RepositoryConfig config = createSparqlDigestAuthConfig("testuser", "testpassword", null);
        exception.expect(RepositoryConfigException.class);
        exception.expectMessage("No realm specified for SPARQL digest auth repository.");
        config.validate();
    }

    @Test
    public void testValidConfiguration() throws Exception{
        RepositoryConfig config = createSparqlDigestAuthConfig("testuser", "testpassword", "testrealm");
        config.validate();
        assertConfig(config);
    }
    
    @Test
    public void testParseConfiguration() throws Exception{
        Model model = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(DIGEST_AUTH_CONFIG_FILE),
                baseIri
                );
        
        RepositoryConfig config = RepositoryConfigUtils.createRepositoryConfig(model);
        assertConfig(config);
    }

    @Test
    public void testSerializeConfiguration() throws Exception{
        Model fileModel = TestUtils.readTurtleInputStreamIntoModel(
                TestUtils.readPlainTextTurtleInput(DIGEST_AUTH_CONFIG_FILE),
                baseIri
                );
        
        RepositoryConfig config = createSparqlDigestAuthConfig("testuser", "testpassword", "testrealm");
        
        Model model = new LinkedHashModel();
        config.export(model);
        assertTrue(Models.isomorphic(fileModel, model));
    }
    
    private void assertConfig(RepositoryConfig config){
        assertEquals("test-sparql-digest-auth-repository", config.getID());
        assertEquals("Test SPARQL Digest Auth Description", config.getTitle());
        assertTrue(config.getRepositoryImplConfig() instanceof SPARQLDigestAuthRepositoryConfig);
        SPARQLDigestAuthRepositoryConfig impl = ((SPARQLDigestAuthRepositoryConfig)config.getRepositoryImplConfig());
        assertEquals(sparqlRepositoryUrl, impl.getQueryEndpointUrl());
        assertEquals(sparqlRepositoryUpdateUrl, impl.getUpdateEndpointUrl());
        assertEquals("testuser", impl.getUsername());
        assertEquals("testpassword", impl.getPassword());
        assertEquals("testrealm", impl.getRealm());
    }
    
    public RepositoryConfig createSparqlDigestAuthConfig(String username, String password, String realm){
    
        final RepositoryConfig repConfig = new RepositoryConfig(
                "test-sparql-digest-auth-repository" , "Test SPARQL Digest Auth Description");
        SPARQLDigestAuthRepositoryConfig repImplConfig = new SPARQLDigestAuthRepositoryConfig();
        repImplConfig.setQueryEndpointUrl(sparqlRepositoryUrl);
        repImplConfig.setUpdateEndpointUrl(sparqlRepositoryUpdateUrl);
        repImplConfig.setUsername(username);
        repImplConfig.setPassword(password);
        repImplConfig.setRealm(realm);
        repConfig.setRepositoryImplConfig(repImplConfig);
        
        return repConfig;
        
    }

}