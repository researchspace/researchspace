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

package org.researchspace.templates;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Optional;

import com.google.common.base.Charsets;
import com.google.common.collect.Lists;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SKOS;
import org.hamcrest.collection.IsIterableContainingInAnyOrder;
import org.hamcrest.collection.IsIterableContainingInOrder;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.LabelCache;
import org.researchspace.cache.QueryTemplateCache;
import org.researchspace.cache.TemplateIncludeCache;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.junit.*;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.fields.FieldsBasedSearch;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.templates.HandlebarsHelperRegistry;
import org.researchspace.templates.ResearchSpaceHandlebars;
import org.researchspace.templates.TemplateByIriLoader;
import org.researchspace.templates.TemplateContext;
import org.researchspace.templates.TemplateUtil;

import com.github.jknack.handlebars.io.TemplateLoader;
import com.google.common.collect.Sets;
import com.google.inject.Inject;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */

public class TemplateUtilIntegrationTest extends AbstractRepositoryBackedIntegrationTest {
    @Inject
    private TemplateIncludeCache includeCache;

    @Inject
    @Rule
    public RepositoryRule repositoryRule;

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    @Inject
    @Rule
    public PlatformStorageRule platformStorageRule;

    @Rule
    public ExpectedException exception = ExpectedException.none();

    @Inject
    private LabelCache labelCache;

    @Inject
    private QueryTemplateCache queryTemplateCache;

    @Inject
    private CacheManager cacheManager;

    private ResearchSpaceHandlebars handlebars;

    private final ValueFactory vf = SimpleValueFactory.getInstance();

    @Before
    public void setup() throws Exception {
        NamespaceRegistry ns = namespaceRule.getNamespaceRegistry();
        PlatformStorage platformStorage = platformStorageRule.getPlatformStorage();
        TemplateLoader loader = new TemplateByIriLoader(platformStorage, ns);
        RepositoryManager repositoryManager = repositoryRule.getRepositoryManager();
        this.handlebars = new ResearchSpaceHandlebars(loader,
                new HandlebarsHelperRegistry(repositoryManager,
                        new FieldDefinitionManager(repositoryManager, cacheManager),
                        new FieldsBasedSearch(ns, repositoryManager, labelCache), queryTemplateCache, labelCache));
        cacheManager.deregisterAllCaches();
    }

    @Test
    public void getTemplateSourceTest() throws Exception {
        String content = "This is the person template";
        storeNewRevision(FOAF.PERSON, content);

        assertEquals(content, TemplateUtil.getTemplateSource(this.handlebars.getLoader(), FOAF.PERSON.stringValue())
                .get().content(Charsets.UTF_8));

        assertFalse(TemplateUtil.getTemplateSource(this.handlebars.getLoader(), FOAF.AGENT.stringValue()).isPresent());
    }

    @Test
    public void findFirstExistingTemplateTest() throws Exception {
        storeNewRevision(FOAF.PERSON, "This is the person template");
        storeNewRevision(FOAF.AGENT, "This is the agent template");
        LinkedHashSet<String> set = Sets.newLinkedHashSet();
        set.add(RDF.TYPE.stringValue());
        set.add(FOAF.PERSON.stringValue());
        set.add(FOAF.AGENT.stringValue());
        assertEquals(FOAF.PERSON.stringValue(),
                TemplateUtil.findFirstExistingTemplate(this.handlebars.getLoader(), set).get());

        set = Sets.newLinkedHashSet();
        set.add(RDF.TYPE.stringValue());
        set.add(FOAF.AGENT.stringValue());
        set.add(FOAF.PERSON.stringValue());
        assertEquals(FOAF.AGENT.stringValue(),
                TemplateUtil.findFirstExistingTemplate(this.handlebars.getLoader(), set).get());

        assertFalse(TemplateUtil.findFirstExistingTemplate(this.handlebars.getLoader(), Sets.<String>newLinkedHashSet())
                .isPresent());
    }

    @Test
    public void compileAndReturnFirstExistingTemplateTest() throws Exception {

        storeNewRevision(FOAF.PERSON, "This is the person template");
        storeNewRevision(FOAF.AGENT, "This is the agent template");
        LinkedHashSet<String> set = Sets.newLinkedHashSet();
        set.add(RDF.TYPE.stringValue());
        set.add(FOAF.PERSON.stringValue());
        set.add(FOAF.AGENT.stringValue());
        assertEquals("This is the person template",
                TemplateUtil.compileAndReturnFirstExistingTemplate(context(FOAF.PERSON), set, this.handlebars).get());

        set = Sets.newLinkedHashSet();
        set.add(RDF.TYPE.stringValue());
        set.add(FOAF.AGENT.stringValue());
        set.add(FOAF.PERSON.stringValue());
        assertEquals("This is the agent template",
                TemplateUtil.compileAndReturnFirstExistingTemplate(context(FOAF.AGENT), set, this.handlebars).get());

        assertFalse(TemplateUtil.compileAndReturnFirstExistingTemplate(context(FOAF.AGENT),
                Sets.<String>newLinkedHashSet(), this.handlebars).isPresent());
    }

    @Test
    public void getRdfTemplateIncludeIdentifiersTest() throws Exception {
        // TODO make sure that the standard query is used and not inference with
        // getRdfTemplateIncludeIdentifiersOrderTest
        // should be done with proper JUnit configuration rule
        config.getUiConfig().setParameter("templateIncludeQuery",
                Collections.singletonList("SELECT ?type WHERE { ?? a ?type }"), TestPlatformStorage.STORAGE_ID);

        IRI joe = vf.createIRI("http://www.researchspace.org/joe");
        this.addStatements(Lists.newArrayList(vf.createStatement(joe, RDF.TYPE, FOAF.PERSON),
                vf.createStatement(joe, RDF.TYPE, FOAF.AGENT)));
        LinkedHashSet<String> set = Sets.newLinkedHashSet();
        set.add("Template:" + FOAF.PERSON.stringValue());
        set.add("Template:" + FOAF.AGENT.stringValue());
        Assert.assertThat(set, IsIterableContainingInAnyOrder.containsInAnyOrder(
                TemplateUtil.getRdfTemplateIncludeIdentifiers(joe, context(joe), includeCache).toArray()));
    }

    public void getRdfTemplateIncludeIdentifiersOrderTest() throws UnknownConfigurationException {
        config.getUiConfig()
                .setParameter("templateIncludeQuery",
                        Collections.singletonList("SELECT ?type WHERE { VALUES(?type) {" + "(<"
                                + FOAF.PERSON.stringValue() + ">) " + "(<" + FOAF.AGENT.stringValue() + ">)  " + "(<"
                                + SKOS.CONCEPT.stringValue() + ">)} }"),
                        TestPlatformStorage.STORAGE_ID);
        LinkedHashSet<Resource> includes = includeCache.getTypesForIncludeScheme(repositoryRule.getRepository(),
                vf.createIRI("http://www.researchspace.org/anyIRI"), Optional.of(namespaceRule.getNamespaceRegistry()));
        Assert.assertThat(Lists.newArrayList(FOAF.PERSON, FOAF.AGENT, SKOS.CONCEPT),
                IsIterableContainingInOrder.contains(includes.toArray()));
        IRI joe = vf.createIRI("http://www.researchspace.org/joe");

        LinkedHashSet<String> set = Sets.newLinkedHashSet();
        set.add("Template:" + FOAF.PERSON.stringValue());
        set.add("Template:" + FOAF.AGENT.stringValue());
        set.add("Template:" + SKOS.CONCEPT.stringValue());
        Assert.assertThat(set, IsIterableContainingInOrder
                .contains(TemplateUtil.getRdfTemplateIncludeIdentifiers(joe, context(joe), includeCache).toArray()));
    }

    @Test
    public void getPageDifferentFromContextValue() throws Exception {
        IRI page = vf.createIRI("http://www.researchspace.org/testpage123");
        IRI joe = vf.createIRI("http://www.researchspace.org/joe");

        storeNewRevision(page, "This the page testpage123, but the context is: [[this]]");
        assertEquals("This the page testpage123, but the context is: http://www.researchspace.org/joe",
                org.researchspace.rest.endpoint.TemplateEndpoint.RenderedTemplate.getCompiledHtml(page, context(joe),
                        handlebars, includeCache));
    }

    private TemplateContext context(IRI iri) {
        TemplateContext context = new TemplateContext(iri, this.repositoryRule.getRepository(), null, null);
        context.setNamespaceRegistry(namespaceRule.getNamespaceRegistry());
        Assert.assertTrue(context.getNamespaceRegistry().isPresent());
        return context;
    }

    private void storeNewRevision(IRI templateIri, String content) throws IOException {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        platformStorageRule.getObjectStorage().appendObject(TemplateByIriLoader.templatePathFromIri(templateIri),
                platformStorageRule.getPlatformStorage().getDefaultMetadata(), new ByteArrayInputStream(bytes),
                bytes.length);
    }
}
