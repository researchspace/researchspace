/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.data.rdf.container;


import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Optional;

import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

import org.junit.Before;
import org.junit.Test;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.rio.RDFFormat;

import com.metaphacts.junit.TestUtils;
import com.metaphacts.vocabulary.LDP;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class QueryCatalogContainerTest extends AbstractLDPTest {

    @Before
    public void before(){
        
    }
    
    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = sparqlPermissionShiroFile //TODO
    )
    public void testAutoInitialize() throws Exception{
        IRI dummyResource = vf.createIRI("http://www.test.com/DummyResource");
        
        // assert that triple store is empty
        assertEquals(0,connection().size());
        
        // it should be possible to add a resource to a container even though it
        // hasn't been created yet as long as the container has a corresponding implementation
        LDPResource res = api.createLDPResource(Optional.of(dummyResource.stringValue()), new RDFStream(TestUtils.readPlainTextTurtleInput(FILE_DUMMY_RESOURCE_TTL), RDFFormat.TURTLE), QueryCatalogContainer.IRI, "http://www.metaphacts.com/testinstances/");
        assertEquals(QueryCatalogContainer.IRI, res.getParentContainer());
        
        // the container will be initialized
        assertTrue(connection().hasStatement(QueryCatalogContainer.IRI, RDF.TYPE, LDP.Container));
        assertTrue(connection().hasStatement(QueryCatalogContainer.IRI, RDFS.LABEL, vf.createLiteral("Query Catalog Container")));
        
        QueryCatalogContainer cnt = (QueryCatalogContainer) api.getLDPResource(QueryCatalogContainer.IRI);
        assertEquals(Sets.<Value>newLinkedHashSet(Lists.<Value>newArrayList(dummyResource)),cnt.getContainedResources());
    }

}