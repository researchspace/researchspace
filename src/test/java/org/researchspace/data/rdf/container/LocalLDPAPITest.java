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

package org.researchspace.data.rdf.container;

import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.researchspace.api.dto.query.SelectQuery;
import org.researchspace.api.dto.querytemplate.QueryArgument;
import org.researchspace.api.dto.querytemplate.SelectQueryTemplate;
import org.researchspace.api.rest.client.QueryCatalogAPIClientImpl;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClient;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClientImpl;
import org.researchspace.data.rdf.container.LocalLDPAPIClient;
import org.researchspace.data.rdf.container.QueryContainer;
import org.researchspace.junit.ResearchSpaceGuiceTestModule;

@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public class LocalLDPAPITest extends AbstractLDPTest {

    ValueFactory VF = SimpleValueFactory.getInstance();

    public LocalLDPAPITest() {
        // TODO Auto-generated constructor stub
    }

    protected void loadData() throws Exception {
        Repository repo = repositoryRule.getRepository();
        try (RepositoryConnection conn = repo.getConnection()) {
            conn.add(this.getClass().getResourceAsStream("testQueryTemplateContainer.trig"), "", RDFFormat.TRIG);
        }
    }

    @Test
    public void testLoad() throws Exception {
        loadData();
        LocalLDPAPIClient ldpClient = new LocalLDPAPIClient(this.api, QueryContainer.IRI);
        QueryCatalogAPIClientImpl queryClient = new QueryCatalogAPIClientImpl(ldpClient);

        QueryTemplateCatalogAPIClient templateClient = new QueryTemplateCatalogAPIClientImpl(ldpClient, queryClient);

        SelectQueryTemplate template = templateClient.getSelectQueryTemplate(
                VF.createIRI("http://localhost:10214/container/queryTemplateContainer/test-query"));

        Assert.assertEquals(1, template.getArguments().size());
        QueryArgument arg = template.getArguments().iterator().next();
        Assert.assertEquals(VF.createIRI("http://www.researchspace.org/query/test-query/arg/0"), arg.getId());
        Assert.assertEquals(VF.createIRI("http://www.w3.org/2001/XMLSchema#anyURI"), arg.getValueType());
        Assert.assertEquals("type", arg.getLabel());
        Assert.assertEquals("type", arg.getPredicate());

        SelectQuery sq = template.getQuery();
        Assert.assertEquals("SELECT * WHERE {   ?x a ?type . }",
                sq.getQueryString().replace("\r\n", " ").replace('\n', ' '));
    }
}
