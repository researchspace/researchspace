/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.transform;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.junit.Test;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.queryform.QueryFormConfiguration;
import org.researchspace.api.dto.queryform.QueryFormElement;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.uiform.Choice;
import org.researchspace.api.dto.uiform.TextInput;
import org.researchspace.api.transform.ModelToQueryFormConfigurationTransformer;
import org.researchspace.api.transform.ModelToQueryTemplateTransformer;
import org.researchspace.api.transform.ModelToQueryTransformer;

public class ModelToQueryFormConfigurationTest extends BaseModelToDtoTest {

    @Test
    public void testModelToTemplateTest() throws Exception {
        Model queryModel = readTurtleInputStreamIntoModel(FILE_SPIN_QUERY_TTL, vf.createIRI("http://www.test.de"));

        Query<?> query = new ModelToQueryTransformer().modelToDto(queryModel);
        assertNotNull(query);

        Model templateModel = readTurtleInputStreamIntoModel(FILE_SPIN_TEMPLATE_TTL,
                vf.createIRI("http://www.test.de"));
        QueryTemplate<?> template = new ModelToQueryTemplateTransformer(new QueryCatalogTestAPI(query))
                .modelToDto(templateModel);
        assertNotNull(template);

        Model configurationModel = readTurtleInputStreamIntoModel(FILE_QUERY_FORM_TTL,
                vf.createIRI("http://www.test.de"));
        QueryFormConfiguration<?> form = new ModelToQueryFormConfigurationTransformer(
                new QueryTemplateCatalogTestAPI(template)).modelToDto(configurationModel);

        assertNotNull(form);

        IRI configurationId = vf.createIRI("http://www.test.de/queryForm");
        assertEquals(configurationId, form.getId());

        assertEquals("Please enter a name for a person that knows other persons.\nYou may restrict the known persons.",
                form.getDescription().replace("\r\n", "\n"));
        assertEquals("Persons with a specified name that know other persons.", form.getLabel());

        assertNotNull(form.getQueryTemplate());
        assertEquals(template.getId(), form.getQueryTemplate().getId());

        assertEquals(2, form.getQueryFormElements().size());

        IRI el1Id = vf.createIRI("http://www.test.de/queryForm/element1");
        IRI el2Id = vf.createIRI("http://www.test.de/queryForm/element2");

        QueryFormElement el1 = form.getQueryFormElement(el1Id);
        QueryFormElement el2 = form.getQueryFormElement(el2Id);

        assertNotNull(el1);
        assertNotNull(el2);

        // 1st is explicitly not required
        assertFalse(el1.isRequired());
        // 2nd has no required specified and as such should be required by default
        assertTrue(el2.isRequired());

        assertEquals("Friend", el1.getLabel());
        assertEquals("Name of the Person", el2.getLabel());

        assertEquals("Friend to be known", el1.getDescription());
        assertEquals("Name of the Person that should know another person", el2.getDescription());

        // has no order assigned explicitly, so we expect to return 0 by default
        assertEquals(0, el1.getElementOrderNr());
        assertEquals(2, el2.getElementOrderNr());

        assertTrue(el1.getUiFormElement() instanceof Choice);
        assertTrue(el2.getUiFormElement() instanceof TextInput);

        assertEquals(vf.createIRI("http://www.test.de/suggestionQuery"), el1.getSuggestionQueryId());
        assertNull(el2.getSuggestionQueryId());
    }

}
