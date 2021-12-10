/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.sail.rest;

import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.Assert.assertEquals;

import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Ignore;
import org.junit.Test;
import org.researchspace.sparql.SparqlTestUtils;

import com.github.tomakehurst.wiremock.junit.WireMockRule;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */
@Ignore
public class MapboxSailTest {
    @ClassRule
    public static WireMockRule wireMockRule = new WireMockRule(
            options().dynamicPort().usingFilesUnderClasspath("org/researchspace/sail/rest"));

    private static Repository mapboxRepo;

    @BeforeClass
    public static void setup() throws Exception {
        // Change access token
        mapboxRepo = RESTSailTestUtils.createRestSailRepo(
                "/org/researchspace/apps/default/config/services/mapbox_descriptor.ttl", wireMockRule.port(),
                "/directions/v5/mapbox/cycling?access_token=pk.xxx", "POST", "application/x-www-form-urlencoded");
    }

    @AfterClass
    public static void teardown() {
        mapboxRepo.shutDown();
    }

    @Test
    public void testMapboxPost() throws Exception {
        String query = SparqlTestUtils.loadClasspathResourceAsUtf8String(OsmSailTest.class, "mapbox-query.sq");
        List<BindingSet> results = Repositories.tupleQuery(mapboxRepo, query, r -> QueryResults.asList(r));
        assertEquals(2, results.size());
        assertEquals("3.1523514729292694", results.get(0).getBinding("distance").getValue().stringValue());
    }
}
