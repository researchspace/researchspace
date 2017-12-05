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

package com.metaphacts.cache;

import java.util.List;

import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.config.ConfigurationUtil;
import com.metaphacts.junit.AbstractRepositoryBackedIntegrationTest;

/**
 * Test cases for configuration class functionality.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class ConfigurationTest extends AbstractRepositoryBackedIntegrationTest {

    @Test
    public void testConfigGroupsAccess() {
        
        Assert.assertNotNull(config.getUiConfig());
        Assert.assertNotNull(config.getEnvironmentConfig());
        Assert.assertNotNull(config.getGlobalConfig());
        
    }
    
    @Test
    public void testDefaults() {
        
        // Note: this test may need adjustment if defaults change
        
        // simple string without default value
        Assert.assertNull(config.getEnvironmentConfig().getSparqlEndpoint());
        
        // list-based configuration value
        final List<String> preferredLabels = config.getUiConfig().getPreferredLabels();
        Assert.assertEquals(1, preferredLabels.size());
        Assert.assertEquals("<" + RDFS.LABEL.stringValue() + ">", preferredLabels.get(0));
    }

    @Test
    public void testSetAndGetStringConfigParameter() {
        
        final String dummyQuery = "SELECT * WHERE { ?s ?p ?o }";
        
        config.getUiConfig().setParameter("templateIncludeQuery", dummyQuery);
        Assert.assertEquals(dummyQuery, config.getUiConfig().getTemplateIncludeQuery());
        
    }
    
    @Test
    public void testSetAndGetStringListConfigParameter() {
        
        final String languageConf = "en,uk,de";
        
        config.getUiConfig().setParameter("preferredLanguages", languageConf);
        Assert.assertEquals(3, config.getUiConfig().getPreferredLanguages().size());
        Assert.assertEquals("en", config.getUiConfig().getPreferredLanguages().get(0));
        Assert.assertEquals("uk", config.getUiConfig().getPreferredLanguages().get(1));
        Assert.assertEquals("de", config.getUiConfig().getPreferredLanguages().get(2));
    }
    
    @Test
    public void testSetAndGetStringListConfigParameterTrimmed() {
        
        final String languageConf = "en, uk   , de";
        
        config.getUiConfig().setParameter("preferredLanguages", languageConf);
        Assert.assertEquals(3, config.getUiConfig().getPreferredLanguages().size());
        Assert.assertEquals("en", config.getUiConfig().getPreferredLanguages().get(0));
        Assert.assertEquals("uk", config.getUiConfig().getPreferredLanguages().get(1));
        Assert.assertEquals("de", config.getUiConfig().getPreferredLanguages().get(2));
    }
    
    
    @Test
    public void testSetAndGetStringListConfigParameterWithEscaping() {
        
        final String languageConf = "en,uk,de-with-\\,-inside";
        
        config.getUiConfig().setParameter("preferredLanguages", languageConf);
        Assert.assertEquals(3, config.getUiConfig().getPreferredLanguages().size());
        Assert.assertEquals("en", config.getUiConfig().getPreferredLanguages().get(0));
        Assert.assertEquals("uk", config.getUiConfig().getPreferredLanguages().get(1));
        Assert.assertEquals("de-with-,-inside", config.getUiConfig().getPreferredLanguages().get(2));
    }
    
    @Test
    public void testConfigurationUtilListConversion() {
        
        final String valueStr = "Michael, Peter, Artem\\, Johannes";
        final List<String> values = ConfigurationUtil.configValueAsList(valueStr);
        
        Assert.assertEquals(3, values.size());
        Assert.assertEquals("Michael", values.get(0));
        Assert.assertEquals("Peter", values.get(1));
        Assert.assertEquals("Artem, Johannes", values.get(2));
    }
    
}