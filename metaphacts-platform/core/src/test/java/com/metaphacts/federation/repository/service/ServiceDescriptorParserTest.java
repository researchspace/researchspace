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

package com.metaphacts.federation.repository.service;

import static org.junit.Assert.assertEquals;

import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.federation.repository.service.ServiceDescriptor;
import com.metaphacts.federation.repository.service.ServiceDescriptor.Parameter;
import com.metaphacts.repository.MpRepositoryVocabulary;

public class ServiceDescriptorParserTest {

    public ServiceDescriptorParserTest() {

    }

    @Test
    public void testParseServiceDescriptor() throws Exception {
        Model model = Rio.parse(ServiceDescriptorParserTest.class.getResourceAsStream("wikidata-text.ttl"), "",
                RDFFormat.TURTLE);
        
        IRI rootNode = Models.subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();
        
        ServiceDescriptor serviceDescriptor = new ServiceDescriptor();
        
        serviceDescriptor.parse(model, rootNode);
        
        Map<String, Parameter> inputs = serviceDescriptor.getInputParameters();
        
        assertEquals(1, inputs.size());
        
        Parameter param = inputs.get("token");
        List<StatementPattern> objectPatterns = param.getObjectPatterns();
        assertEquals(1, objectPatterns.size());
        
        Map<String, Parameter> outputs = serviceDescriptor.getOutputParameters();
        assertEquals(4, outputs.size());
        
        param = outputs.get("uri");
        assertEquals(0, param.getObjectPatterns().size());
        assertEquals(4, param.getSubjectPatterns().size());
        
        param = outputs.get("rank");
        assertEquals(1, param.getObjectPatterns().size());
        assertEquals(0, param.getSubjectPatterns().size());
        
        param = outputs.get("description");
        assertEquals(1, param.getObjectPatterns().size());
        assertEquals(0, param.getSubjectPatterns().size());
        
        param = outputs.get("label");
        assertEquals(1, param.getObjectPatterns().size());
        assertEquals(0, param.getSubjectPatterns().size());
    }

}