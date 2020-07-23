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

package org.researchspace.rest.endpoint;

import java.io.StringWriter;
import java.nio.charset.Charset;
import java.util.Map;

import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.io.IOUtils;
import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.glassfish.jersey.server.ResourceConfig;
import org.hamcrest.Matchers;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.cache.CacheManager;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.junit.JerseyTest;
import org.researchspace.querycatalog.QueryCatalogRESTServiceRegistryRule;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.rest.endpoint.RepositoryManagerEndpoint;

import com.github.jsonldjava.shaded.com.google.common.collect.Sets;
import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.inject.Inject;

public class RepositoryManagerEndpointTest extends JerseyTest {

    protected final String qaasPermissionShiroFile = "classpath:org/researchspace/security/shiro-repositories-rights.ini";

    @Rule // required to initialize the security manager
    public ShiroRule shiroRule = new ShiroRule();

    @Inject
    @Rule
    public QueryCatalogRESTServiceRegistryRule registryRule;

    @Inject
    public CacheManager cacheManager;

    private ValueFactory VF = SimpleValueFactory.getInstance();

    public RepositoryManagerEndpointTest() {

    }

    @Override
    protected void register(ResourceConfig resourceConfig) {
        resourceConfig.register(RepositoryManagerEndpoint.class);
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        cacheManager.deregisterAllCaches();
        namespaceRule.set("test", "http://www.researchspace.org/test/");
        registryRule.setLDPRepository(RepositoryManager.ASSET_REPOSITORY_ID);

        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryTemplateContainer.trig"), "", RDFFormat.TRIG);
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryTemplateContainerConstruct.trig"), "",
                    RDFFormat.TRIG);
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryTemplateContainerUpdate.trig"), "",
                    RDFFormat.TRIG);
        }

        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(this.getClass().getResourceAsStream("dummyData.ttl"), "", RDFFormat.TURTLE);
        }
    }

    @Override
    @After
    public void tearDown() throws Exception {
        super.tearDown();
        repositoryRule.delete();
    }

    private Response addTestTurtleRepositoryConfig(String id) throws Exception {
        StringWriter writer = new StringWriter();
        IOUtils.copy(RepositoryManager.class.getResourceAsStream(id + ".ttl"), writer, Charset.forName("utf-8"));
        String strRepoConfig = writer.toString();
        return target("/repositories/config/" + id).request().post(Entity.entity(strRepoConfig, MediaType.TEXT_PLAIN));
    }

    @SubjectAware(username = "admin", password = "admin", configuration = qaasPermissionShiroFile)
    @Test
    public void testAddRepository() throws Exception {
        Map<String, Boolean> repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(3, repoConfigsMap.size());
        Response res = addTestTurtleRepositoryConfig("test-sail-memory-repository");
        Assert.assertEquals(Status.OK, res.getStatusInfo());
        repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(4, repoConfigsMap.size());

        Repository repo = repositoryRule.getRepositoryManager().getRepository("test-sail-memory-repository");
        try (RepositoryConnection conn = repo.getConnection()) {
            conn.add(VF.createStatement(VF.createBNode(), RDFS.LABEL, VF.createLiteral("label")));
            Assert.assertEquals(1, Iterations.asList(conn.getStatements(null, null, null)).size());
        }
    }

    @SubjectAware(username = "admin", password = "admin", configuration = qaasPermissionShiroFile)
    @Test
    public void testDeleteRepository() throws Exception {
        Map<String, Boolean> repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(3, repoConfigsMap.size());
        Response res = addTestTurtleRepositoryConfig("test-sail-memory-repository");
        Assert.assertEquals(Status.OK, res.getStatusInfo());
        repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(4, repoConfigsMap.size());

        Repository repo = repositoryRule.getRepositoryManager().getRepository("test-sail-memory-repository");
        try (RepositoryConnection conn = repo.getConnection()) {
            conn.add(VF.createStatement(VF.createBNode(), RDFS.LABEL, VF.createLiteral("label")));
            Assert.assertEquals(1, Iterations.asList(conn.getStatements(null, null, null)).size());
        }
        Assert.assertTrue(repo.isInitialized());

        res = target("/repositories/config/test-sail-memory-repository").request().delete();
        Assert.assertEquals(Status.OK, res.getStatusInfo());
        repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(3, repoConfigsMap.size());
        Assert.assertFalse(repo.isInitialized());

    }

    @SubjectAware(username = "sparqluser", password = "sparql", configuration = qaasPermissionShiroFile)
    @Test
    public void testGetEndpointConfigs() throws Exception {

        // validate that we have three repositories
        Map<String, Boolean> repoConfigsMap = repositoryRule.getRepositoryManager().getAvailableRepositoryConfigs();
        Assert.assertEquals(Sets.newHashSet("default", "assets", "tests"), repoConfigsMap.keySet());

        Response res = target("/repositories/").request().get();
        String resultString = res.readEntity(String.class);
        Assert.assertThat(resultString, Matchers.containsString("default"));
        Assert.assertThat(resultString, Matchers.containsString("assets"));
        Assert.assertThat(resultString, Matchers.not(Matchers.containsString("tests")));
    }

}
