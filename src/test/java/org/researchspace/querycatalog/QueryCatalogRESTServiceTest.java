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

package org.researchspace.querycatalog;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.researchspace.api.dto.querytemplate.QueryArgument;
import org.researchspace.querycatalog.QueryCatalogRESTService;

public class QueryCatalogRESTServiceTest {

    private static ValueFactory VF = SimpleValueFactory.getInstance();
    private static final String TEST_NS = "http://example.org";

    @Rule
    public ExpectedException expectedException = ExpectedException.none();

    public QueryCatalogRESTServiceTest() {

    }

    @Test
    public void testCastAnyURI() {
        Value val = QueryCatalogRESTService.interpretInputParameter(
                new QueryArgument(VF.createIRI(TEST_NS + "arg1"), "x", "", "x", XMLSchema.ANYURI),
                FOAF.PERSON.stringValue());
        Assert.assertEquals(FOAF.PERSON, val);
    }

    @Test
    public void testCastAnyURIFail() {
        expectedException.expect(IllegalArgumentException.class);
        QueryCatalogRESTService.interpretInputParameter(
                new QueryArgument(VF.createIRI(TEST_NS + "arg1"), "x", "", "x", XMLSchema.ANYURI), "Some string");
    }

    @Test
    public void testCastRDFSResource() {
        Value val = QueryCatalogRESTService.interpretInputParameter(
                new QueryArgument(VF.createIRI(TEST_NS + "arg1"), "x", "", "x", RDFS.RESOURCE),
                FOAF.PERSON.stringValue());
        Assert.assertEquals(FOAF.PERSON, val);
    }

    @Test
    public void testCastInteger() {
        Value val = QueryCatalogRESTService.interpretInputParameter(
                new QueryArgument(VF.createIRI(TEST_NS + "arg1"), "z", "", "z", XMLSchema.INT), "11");
        Assert.assertEquals(VF.createLiteral(11), val);
    }

    @Test
    public void testAddNonExistingArgument() {
        expectedException.expect(IllegalArgumentException.class);
        QueryCatalogRESTService.interpretInputParameter(null, FOAF.PERSON.stringValue());
    }

}
