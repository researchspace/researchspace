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
import org.junit.Test;
import org.researchspace.sparql.SparqlTestUtils;

import com.github.tomakehurst.wiremock.junit.WireMockRule;

/**
 * This an example of test for {@link RESTSail} implement with
 * http://wiremock.org/docs/.
 * 
 * How this test was implemented:
 * 
 * 1) Start wiremock test recorder, execute the command in the root of the RS
 * code base - ./gradlew runWiremock
 * 
 * 2) Go to http://localhost:10220/__admin/recorder/ in the browser 3) Paste
 * https://nominatim.openstreetmap.org into Target URL input and click
 * "Recording" 4) Execute somehow the request as it should be send by the SAIL,
 * but instead of original URL use http://localhost:10220 as a base e.g for
 * nominatim search we need to execute something like:
 * 
 * curl
 * 'http://localhost:10220/search?q=British%20Museum&polygon_text=1&format=json&extraargs=1'
 * -H 'Accept: application/json'
 * 
 * 3) Stop the recording, go to http://localhost:10220/__admin/mappings to see
 * the stub that we recorded, it contains Request + Response, the stubs are also
 * available in the ./mapping folder in the root of the RS code base
 * 
 * 4) Copy stub into some folder in the src/test/resources, e.g see
 * src/test/resources/org/researchspace/sail/rest/mappings/osm-nominatim-search-bm-request-mock.json
 * 
 * 5) Initialize wireMock pointing to the folder one level up from mappings, e.g
 * in this case it is org/researchspace/sail/rest
 * 
 * 6) Now you can issue your test queries to SAIL repo
 * 
 * @author Artem Kozlov
 */
public class OsmSailTest {

    @ClassRule
    public static WireMockRule wireMockRule = new WireMockRule(
            options().dynamicPort().usingFilesUnderClasspath("org/researchspace/sail/rest"));

    private static Repository osmRepo;

    @BeforeClass
    public static void setup() throws Exception {
        osmRepo = RESTSailTestUtils.createRestSailRepo(
                "/org/researchspace/apps/default/config/services/osm-nominatim-search.ttl", wireMockRule.port(),
                "/search", "GET");
    }

    @AfterClass
    public static void teardown() {
        osmRepo.shutDown();
    }

    @Test
    public void testOsmSearch() throws Exception {
        String query = SparqlTestUtils.loadClasspathResourceAsUtf8String(OsmSailTest.class, "osm-bm-query.sq");
        List<BindingSet> results = Repositories.tupleQuery(osmRepo, query, r -> QueryResults.asList(r));
        assertEquals(4, results.size());
        assertEquals(
                "British Museum, Great Russell Street, St Giles, Bloomsbury, London Borough of Camden, London, Greater London, England, WC1B 3DG, United Kingdom",
                results.get(0).getBinding("label").getValue().stringValue());
    }
}
