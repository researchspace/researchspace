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

package com.metaphacts.querycatalog;

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

import com.metaphacts.api.dto.querytemplate.QueryArgument;

public class QueryCatalogRESTServiceTest {
    
    private static ValueFactory VF = SimpleValueFactory.getInstance();
    private static final String TEST_NS = "http://example.org";

    @Rule
    public ExpectedException expectedException = ExpectedException.none();
    
    public QueryCatalogRESTServiceTest() {
        
    }
    
    
    @Test
    public void testCastAnyURI() {
        Value val = QueryCatalogRESTService
                .interpretInputParameter(
                        new QueryArgument(
                                VF.createIRI(TEST_NS + "arg1"), "x", "", "x", XMLSchema.ANYURI), 
                        FOAF.PERSON.stringValue());
        Assert.assertEquals(FOAF.PERSON, val);
    }
    
    @Test
    public void testCastAnyURIFail() {
        expectedException.expect(IllegalArgumentException.class);
        QueryCatalogRESTService
                .interpretInputParameter(
                        new QueryArgument(
                                VF.createIRI(TEST_NS + "arg1"), "x", "", "x", XMLSchema.ANYURI), 
                        "Some string");
    }
    
    @Test
    public void testCastRDFSResource() {        
        Value val = QueryCatalogRESTService
                .interpretInputParameter(
                        new QueryArgument(
                                VF.createIRI(TEST_NS + "arg1"), "x", "", "x", RDFS.RESOURCE), 
                        FOAF.PERSON.stringValue());
        Assert.assertEquals(FOAF.PERSON, val);
    }
    
    @Test
    public void testCastInteger() {        
        Value val = QueryCatalogRESTService
                .interpretInputParameter(
                        new QueryArgument(
                                VF.createIRI(TEST_NS + "arg1"), "z", "", "z", XMLSchema.INT), 
                        "11");
        Assert.assertEquals(VF.createLiteral(11), val);
    }
    
    @Test
    public void testAddNonExistingArgument() {
        expectedException.expect(IllegalArgumentException.class);
        QueryCatalogRESTService.interpretInputParameter(null, FOAF.PERSON.stringValue());
    }

}
