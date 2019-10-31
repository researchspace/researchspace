/*
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package com.metaphacts.api.transform;

import static com.metaphacts.api.transform.ModelUtils.getNotNullObjectLiteral;
import static com.metaphacts.api.transform.ModelUtils.getNotNullSubjectIRI;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.api.dto.query.Query;
import com.metaphacts.api.dto.query.SelectQuery;

public class ModelToQueryTest extends BaseModelToDtoTest {

    @Test
    public void testModelToQuery() throws Exception{
        
        Model m = readTurtleInputStreamIntoModel(FILE_SPIN_QUERY_TTL, vf.createIRI("http://www.test.de"));
        IRI queryIRI = getNotNullSubjectIRI(m, RDF.TYPE, SP.QUERY_CLASS);
        Query<?> query = new ModelToQueryTransformer().modelToDto(m);
        Assert.assertTrue(query instanceof SelectQuery);
        Assert.assertEquals(queryIRI, query.getId());
        Assert.assertEquals(getNotNullObjectLiteral(m, queryIRI, SP.TEXT_PROPERTY).stringValue(),query.getQueryString());
        Assert.assertEquals(getNotNullObjectLiteral(m, queryIRI, RDFS.LABEL).stringValue(),query.getLabel());
    }
    
  

}