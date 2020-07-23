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

package org.researchspace.repository;

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
import org.researchspace.junit.TestUtils;
import org.researchspace.repository.RepositoryConfigUtils;
import org.researchspace.repository.sparql.SPARQLBasicAuthRepositoryConfig;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SPARQLBasicAuthRepositoryConfigTest {
    ValueFactory vf = SimpleValueFactory.getInstance();
    private final IRI baseIri = vf.createIRI("http://www.researchspace.org/base");
    private final String BASIC_AUTHC_CONFIG_FILE = "/org/researchspace/repository/test-sparql-basic-auth-repository.ttl";

    @Rule
    public TemporaryFolder tempFolder = new TemporaryFolder();

    @Rule
    public ExpectedException exception = ExpectedException.none();
    private String sparqlRepositoryUrl = "https://query.wikidata.org/sparql";
    private String sparqlRepositoryUpdateUrl = "https://query.wikidata.org/sparql/update";

    @Test
    public void testNoUser() throws Exception {
        RepositoryConfig config = createSparqlBasicAuthConfig(null, null);
        exception.expect(RepositoryConfigException.class);
        exception.expectMessage("No username specified for SPARQL authenticating repository.");
        config.validate();
    }

    @Test
    public void testNoPassword() throws Exception {
        RepositoryConfig config = createSparqlBasicAuthConfig("testuser", null);
        exception.expect(RepositoryConfigException.class);
        exception.expectMessage("No password specified for SPARQL authenticating repository.");
        config.validate();
    }

    @Test
    public void testValidConfiguration() throws Exception {
        RepositoryConfig config = createSparqlBasicAuthConfig("testuser", "testpassword");
        config.validate();
        assertConfig(config);
    }

    @Test
    public void testParseConfiguration() throws Exception {
        Model model = TestUtils
                .readTurtleInputStreamIntoModel(TestUtils.readPlainTextTurtleInput(BASIC_AUTHC_CONFIG_FILE), baseIri);

        RepositoryConfig config = RepositoryConfigUtils.createRepositoryConfig(model);
        assertConfig(config);
    }

    @Test
    public void testSerializeConfiguration() throws Exception {
        Model fileModel = TestUtils
                .readTurtleInputStreamIntoModel(TestUtils.readPlainTextTurtleInput(BASIC_AUTHC_CONFIG_FILE), baseIri);

        RepositoryConfig config = createSparqlBasicAuthConfig("testuser", "testpassword");

        Model model = new LinkedHashModel();
        config.export(model);
        assertTrue(Models.isomorphic(fileModel, model));
    }

    private void assertConfig(RepositoryConfig config) {
        assertEquals("test-sparql-basic-auth-repository", config.getID());
        assertEquals("Test SPARQL Basic Auth Description", config.getTitle());
        assertTrue(config.getRepositoryImplConfig() instanceof SPARQLBasicAuthRepositoryConfig);
        SPARQLBasicAuthRepositoryConfig impl = ((SPARQLBasicAuthRepositoryConfig) config.getRepositoryImplConfig());
        assertEquals(sparqlRepositoryUrl, impl.getQueryEndpointUrl());
        assertEquals(sparqlRepositoryUpdateUrl, impl.getUpdateEndpointUrl());
        assertEquals("testuser", impl.getUsername());
        assertEquals("testpassword", impl.getPassword());
    }

    public RepositoryConfig createSparqlBasicAuthConfig(String username, String password) {

        final RepositoryConfig repConfig = new RepositoryConfig("test-sparql-basic-auth-repository",
                "Test SPARQL Basic Auth Description");
        SPARQLBasicAuthRepositoryConfig repImplConfig = new SPARQLBasicAuthRepositoryConfig();
        repImplConfig.setQueryEndpointUrl(sparqlRepositoryUrl);
        repImplConfig.setUpdateEndpointUrl(sparqlRepositoryUpdateUrl);
        repImplConfig.setUsername(username);
        repImplConfig.setPassword(password);
        repConfig.setRepositoryImplConfig(repImplConfig);

        return repConfig;

    }

}