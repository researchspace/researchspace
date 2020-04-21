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

package org.researchspace.cache;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.hamcrest.core.IsInstanceOf;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.config.ConfigurationUtil;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.junit.AbstractRepositoryBackedIntegrationTest;
import org.researchspace.junit.TestPlatformStorage;

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
    public void testPreferredLabelsHook() throws UnknownConfigurationException, ConfigurationException {
        List<String> dummyPreferredLabels = Arrays.asList("<http://www.w3.org/2000/01/rdf-schema#label>",
                "<http://www.w3.org/2000/01/rdf-schema#label2>", "<http://www.w3.org/2000/01/rdf-schema#label3>");

        config.getUiConfig().setParameter("preferredLabels", dummyPreferredLabels, TestPlatformStorage.STORAGE_ID);
        Assert.assertEquals(3, config.getUiConfig().getPreferredLabels().size());
        Assert.assertEquals(dummyPreferredLabels.get(0), config.getUiConfig().getPreferredLabels().get(0));
        Assert.assertEquals(dummyPreferredLabels.get(1), config.getUiConfig().getPreferredLabels().get(1));
        Assert.assertEquals(dummyPreferredLabels.get(2), config.getUiConfig().getPreferredLabels().get(2));
    }

    @Test
    public void testPreferredLabelsHookException() throws UnknownConfigurationException, ConfigurationException {
        String dummyPreferredLabel = "Dummy unparsable preferred label!";
        exception.expectCause(IsInstanceOf.<RuntimeException>instanceOf(ConfigurationException.class));
        exception.expectMessage("The \"preferredLabels\" that you have entered is invalid. Please add a valid value");

        config.getUiConfig().setParameter("preferredLabels", Collections.singletonList(dummyPreferredLabel),
                TestPlatformStorage.STORAGE_ID);
    }

    @Test
    public void testTempalteInculdeHook() throws UnknownConfigurationException, ConfigurationException {
        String dummyQuery = "SELECT ?type WHERE { ?? a ?type }";
        config.getUiConfig().setParameter("templateIncludeQuery", Collections.singletonList(dummyQuery),
                TestPlatformStorage.STORAGE_ID);
        Assert.assertEquals(dummyQuery, config.getUiConfig().getTemplateIncludeQuery());
    }

    @Test
    public void testTemplateIncludeHookException() throws UnknownConfigurationException, ConfigurationException {
        String dummyQuery = "SELECT * WHERE { ? ?p ?o }";

        exception.expectCause(IsInstanceOf.<RuntimeException>instanceOf(ConfigurationException.class));
        exception.expectMessage("The query that you have entered is invalid. Please add a valid query");
        config.getUiConfig().setParameter("templateIncludeQuery", Collections.singletonList(dummyQuery),
                TestPlatformStorage.STORAGE_ID);
    }

    @Test
    public void testTempalteInculdeHookBindingException() throws UnknownConfigurationException, ConfigurationException {
        String dummyQuery = "SELECT * WHERE { ?s ?p ?o }";

        exception.expectCause(IsInstanceOf.<RuntimeException>instanceOf(ConfigurationException.class));
        exception.expectMessage(
                "Query as specified in \"templateIncludeQuery\" config for extracting the wiki include types must return a binding with name \"type\"");
        config.getUiConfig().setParameter("templateIncludeQuery", Collections.singletonList(dummyQuery),
                TestPlatformStorage.STORAGE_ID);
    }

    @Test
    public void testPreferredThumbnails() throws UnknownConfigurationException, ConfigurationException {
        List<String> dummyPreferredThumbnails = Arrays.asList("<http://schema.org/thumbnail1>",
                "<http://schema.org/thumbnail2>", "<http://schema.org/thumbnail3>");

        config.getUiConfig().setParameter("preferredThumbnails", dummyPreferredThumbnails,
                TestPlatformStorage.STORAGE_ID);
        Assert.assertEquals(3, config.getUiConfig().getPreferredThumbnails().size());
        Assert.assertEquals(dummyPreferredThumbnails.get(0), config.getUiConfig().getPreferredThumbnails().get(0));
        Assert.assertEquals(dummyPreferredThumbnails.get(1), config.getUiConfig().getPreferredThumbnails().get(1));
        Assert.assertEquals(dummyPreferredThumbnails.get(2), config.getUiConfig().getPreferredThumbnails().get(2));
    }

    @Test
    public void testPreferredThumbnailsHookException() throws UnknownConfigurationException, ConfigurationException {
        String dummyPreferredThumbnails = "Dummy unparsable preferred thumbnails!";
        exception.expectCause(IsInstanceOf.<RuntimeException>instanceOf(ConfigurationException.class));
        exception.expectMessage(
                "The \"preferredThumbnails\" that you have entered is invalid. Please add a valid value");
        config.getUiConfig().setParameter("preferredThumbnails", Collections.singletonList(dummyPreferredThumbnails),
                TestPlatformStorage.STORAGE_ID);
    }

    @Test
    public void testSetAndGetStringListConfigParameter() throws UnknownConfigurationException, ConfigurationException {
        List<String> languageConf = Arrays.asList("en", "uk", "de");

        config.getUiConfig().setParameter("preferredLanguages", languageConf, TestPlatformStorage.STORAGE_ID);
        Assert.assertEquals(3, config.getUiConfig().getPreferredLanguages().size());
        Assert.assertEquals("en", config.getUiConfig().getPreferredLanguages().get(0));
        Assert.assertEquals("uk", config.getUiConfig().getPreferredLanguages().get(1));
        Assert.assertEquals("de", config.getUiConfig().getPreferredLanguages().get(2));
    }

    @Test
    public void testSetAndGetStringListConfigParameterWithEscaping()
            throws UnknownConfigurationException, ConfigurationException {
        List<String> languageConf = Arrays.asList("en", "uk", "de-with-,-inside");

        config.getUiConfig().setParameter("preferredLanguages", languageConf, TestPlatformStorage.STORAGE_ID);
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

    @Test
    public void testTemplateInclude_WithComma() throws Exception {
        String dummyQuery = "SELECT ?type WHERE { ?x rdf:type ?type . FILTER(?type IN (<urn:Person>, <urn:Organization>)) } ORDER BY ?type";

        config.getUiConfig().setParameter("templateIncludeQuery", Collections.singletonList(dummyQuery),
                TestPlatformStorage.STORAGE_ID);
        Assert.assertEquals(dummyQuery, config.getUiConfig().getTemplateIncludeQuery());
    }

}
