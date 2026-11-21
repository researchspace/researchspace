/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.repository;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.repository.Repository;
import org.junit.Test;
import org.researchspace.repository.sparql.CustomSPARQLRepository;
import org.researchspace.repository.sparql.DefaultMpSPARQLRepositoryFactory;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;
import org.researchspace.repository.sparql.SPARQLBasicAuthRepositoryConfig;
import org.researchspace.repository.sparql.SPARQLBasicAuthRepositoryFactory;
import org.researchspace.repository.sparql.bearertoken.SPARQLBearerTokenAuthRepositoryConfig;
import org.researchspace.repository.sparql.bearertoken.SPARQLBearerTokenAuthRepositoryFactory;

/**
 * The mph:writable and mph:silentMode flags must be applied by every SPARQL
 * repository factory, otherwise repositories silently become read-only (all
 * writes are rejected by {@link org.researchspace.repository.sparql.CustomSPARQLConnection#commit()}).
 */
public class SPARQLRepositoryFactoryWritableTest {

    private static final String QUERY_ENDPOINT = "http://example.org/sparql";

    @Test
    public void defaultFactoryAppliesWritable() {
        MpSPARQLRepositoryConfig config = new MpSPARQLRepositoryConfig(QUERY_ENDPOINT);
        config.setWritable(true);

        Repository repo = new DefaultMpSPARQLRepositoryFactory().getRepository(config);
        assertTrue(repo.isWritable());
    }

    @Test
    public void bearerTokenFactoryAppliesWritable() {
        SPARQLBearerTokenAuthRepositoryConfig config = new SPARQLBearerTokenAuthRepositoryConfig();
        config.setQueryEndpointUrl(QUERY_ENDPOINT);
        config.setAuthenticationToken("test-token");
        config.setWritable(true);

        Repository repo = new SPARQLBearerTokenAuthRepositoryFactory().getRepository(config);
        assertTrue("writable flag from the config must be applied to the repository", repo.isWritable());
    }

    @Test
    public void bearerTokenFactoryAppliesReadOnly() {
        SPARQLBearerTokenAuthRepositoryConfig config = new SPARQLBearerTokenAuthRepositoryConfig();
        config.setQueryEndpointUrl(QUERY_ENDPOINT);
        config.setAuthenticationToken("test-token");
        config.setWritable(false);

        Repository repo = new SPARQLBearerTokenAuthRepositoryFactory().getRepository(config);
        assertFalse(repo.isWritable());
    }

    @Test
    public void basicAuthFactoryAppliesWritableAndSilentMode() {
        SPARQLBasicAuthRepositoryConfig config = new SPARQLBasicAuthRepositoryConfig();
        config.setQueryEndpointUrl(QUERY_ENDPOINT);
        config.setUsername("user");
        config.setPassword("password");
        config.setWritable(true);
        config.setSilentMode(true);

        Repository repo = new SPARQLBasicAuthRepositoryFactory().getRepository(config);
        assertTrue(repo.isWritable());
        assertTrue(((CustomSPARQLRepository) repo).isSilentMode());
    }
}
