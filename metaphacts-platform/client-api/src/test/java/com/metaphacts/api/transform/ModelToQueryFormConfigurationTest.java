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


import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.junit.Test;

import com.metaphacts.api.dto.query.Query;
import com.metaphacts.api.dto.queryform.QueryFormConfiguration;
import com.metaphacts.api.dto.queryform.QueryFormElement;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.dto.uiform.Choice;
import com.metaphacts.api.dto.uiform.TextInput;

public class ModelToQueryFormConfigurationTest extends BaseModelToDtoTest {
    

    @Test
    public void testModelToTemplateTest() throws Exception{
        Model queryModel = readTurtleInputStreamIntoModel(FILE_SPIN_QUERY_TTL, vf.createIRI("http://www.test.de"));

        Query<?> query = new ModelToQueryTransformer().modelToDto(queryModel);        
        assertNotNull(query);
        
        Model templateModel = readTurtleInputStreamIntoModel(FILE_SPIN_TEMPLATE_TTL, vf.createIRI("http://www.test.de"));
        QueryTemplate<?> template = new ModelToQueryTemplateTransformer( new QueryCatalogTestAPI(query)).modelToDto(templateModel);
        assertNotNull(template);
        
        Model configurationModel = readTurtleInputStreamIntoModel(FILE_QUERY_FORM_TTL, vf.createIRI("http://www.test.de"));
        QueryFormConfiguration<?> form = new ModelToQueryFormConfigurationTransformer( new QueryTemplateCatalogTestAPI(template)).modelToDto(configurationModel);
        
        assertNotNull(form);
        
        IRI configurationId = vf.createIRI("http://www.test.de/queryForm");
        assertEquals(configurationId,form.getId());

        assertEquals(
            "Please enter a name for a person that knows other persons.\nYou may restrict the known persons.",
            form.getDescription().replace("\r\n", "\n")
        );
        assertEquals("Persons with a specified name that know other persons.",form.getLabel());

        assertNotNull(form.getQueryTemplate());
        assertEquals(template.getId(),form.getQueryTemplate().getId());
        
        assertEquals(2,form.getQueryFormElements().size());

        IRI el1Id = vf.createIRI("http://www.test.de/queryForm/element1");
        IRI el2Id = vf.createIRI("http://www.test.de/queryForm/element2");
        
        QueryFormElement el1 = form.getQueryFormElement(el1Id);
        QueryFormElement el2 = form.getQueryFormElement(el2Id);
        
        assertNotNull(el1);
        assertNotNull(el2);
        
        //1st is explicitly not required
        assertFalse(el1.isRequired());
        //2nd has no required specified and as such should be required by default
        assertTrue(el2.isRequired());
        
        assertEquals("Friend",el1.getLabel());
        assertEquals("Name of the Person",el2.getLabel());
       
        assertEquals("Friend to be known",el1.getDescription());
        assertEquals("Name of the Person that should know another person",el2.getDescription());

        // has no order assigned explicitly, so we expect to return 0 by default 
        assertEquals(0, el1.getElementOrderNr());
        assertEquals(2, el2.getElementOrderNr());
        
        assertTrue(el1.getUiFormElement() instanceof Choice);
        assertTrue(el2.getUiFormElement() instanceof TextInput);
        
        assertEquals(vf.createIRI("http://www.test.de/suggestionQuery"),el1.getSuggestionQueryId());
        assertNull(el2.getSuggestionQueryId());
    }

}
