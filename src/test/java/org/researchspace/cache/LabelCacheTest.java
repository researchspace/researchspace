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

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SKOS;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.PropertyPattern;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.junit.AbstractRepositoryBackedIntegrationTest;
import org.researchspace.junit.NamespaceRule;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.junit.TestPlatformStorage;
import org.researchspace.sparql.renderer.MpSparqlQueryRenderer;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.google.inject.Inject;

/**
 * Test cases for {@link LabelCache} functionality.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class LabelCacheTest extends AbstractRepositoryBackedIntegrationTest {

    ValueFactory vf = SimpleValueFactory.getInstance();

    private final static String CUSTOM_NAMESPACE = "http://my.custom.namespace/";

    private final static String IRI1 = CUSTOM_NAMESPACE + "s1";
    private final static String IRI1_LABEL_NOLANG = "label s1 (no language tag)";
    private final static String IRI1_LABEL_EN = "label s1 (en)";
    private final static String IRI1_LABEL_DE = "label s1 (de)";
    private final static String IRI1_LABEL_RU = "label s1 (ru)";
    private final static String IRI1_LABEL_FR = "label s1 (fr)";

    private final static String IRI2 = CUSTOM_NAMESPACE + "s2";
    private final static String IRI2_LABEL_NOLANG = "label s2 (no language tag)";
    private final static String IRI2_LABEL_EN = "label s2 (en)";
    private final static String IRI2_LABEL_DE = "label s2 (de)";
    private final static String IRI2_LABEL_RU = "label s2 (ru)";
    private final static String IRI2_LABEL_FR = "label s2 (fr)";

    private final static String IRI3 = CUSTOM_NAMESPACE + "s3";
    private final static String IRI3_LABEL_EN = "label s3 (en)";
    private final static String IRI3_LABEL_DE = "label s3 (de)";
    private final static String IRI3_LABEL_FR = "label s3 (fr)";

    private final static String CUSTOM_LABEL = CUSTOM_NAMESPACE + "label";

    private final static String LANGUAGE_TAG_DE = "de";
    private final static String LANGUAGE_TAG_EN = "en";
    private final static String LANGUAGE_TAG_RU = "ru";
    private final static String LANGUAGE_TAG_FR = "fr";

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    @Inject
    @Rule
    public PlatformStorageRule storageRule;

    @Inject
    LabelCache labelCache;

    @Before
    public void setup() throws Exception {
        namespaceRule.set("rdfs", RDFS.NAMESPACE);
        namespaceRule.set("skos", SKOS.NAMESPACE);
        namespaceRule.set("myns", CUSTOM_NAMESPACE);

        setUIConfigurationParameter("preferredLabelsResolutionStrategy", "PREFER_LANGUAGE");
    }

    @After
    public void tearDown() throws Exception {

        repositoryRule.delete();
    }

    @Test
    public void testExtractUnknownLabelEmptyDB() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertFalse(label.isPresent());

    }

    @Test
    public void testExtractUnknownLabelNonEmptyDB() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label

        // add a non-label statement for the given IRI
        addStatement(vf.createStatement(asIRI(IRI1), RDF.TYPE, asIRI(IRI2)));

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertFalse(label.isPresent());

    }

    @Test
    public void testExtractKnownLabelWithDefaultLanguageTag() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        // whatever the default will be, it should return the label
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testExtractKnownLabelWithNonMatchingLanguageTag01() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_DE);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        // although not matching the language tag, the "de" label is better
        // than nothing, so it should be returned
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE, label.get().stringValue());
    }

    @Test
    public void testExtractKnownLabelWithNonMatchingLanguageTag02() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        // although not matching the language tag, the none language tag
        // label is better than nothing, so it should be returned
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testSingleLabelSingleLanguageSingleResource01() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_EN, label.get().stringValue());
    }

    @Test
    public void testSingleLabelSingleLanguageSingleResource02() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageDe();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE, label.get().stringValue());
    }

    @Test
    public void testSingleLabelSingleLanguageSingleResource03() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageRu();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_RU, label.get().stringValue());
    }

    @Test
    public void testSingleLabelMultipleLanguagesSingleResource01() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEnNoneDe();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_EN, label.get().stringValue());
    }

    @Test
    public void testSingleLabelMultipleLanguagesSingleResource02() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEnNoneDe();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testSingleLabelMultipleLanguagesSingleResource03() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEnNoneDe();

        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE, label.get().stringValue());
    }

    @Test
    public void testSingleLabelMultipleLanguagesSingleResource04() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEnNoneDe();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testSingleLabelSingeLanguageMultipleResources01() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEnNoneDe();

        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_FR, label.get().stringValue());
    }

    @Test
    public void testSingleLabelSingeLanguageMultipleResources02() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);

        addIri2FrLiteral(RDFS.LABEL, IRI2_LABEL_FR);
        addIri2RuLiteral(RDFS.LABEL, IRI2_LABEL_RU);
        addIri2EnLiteral(RDFS.LABEL, IRI2_LABEL_EN);
        addIri2NoLangTypeLiteral(RDFS.LABEL, IRI2_LABEL_NOLANG);

        addIri3FrLiteral(RDFS.LABEL, IRI3_LABEL_FR);

        final Map<IRI, Optional<Literal>> resultMap = labelCache.getLabels(asIRIList(IRI1, IRI2, IRI3),
                repositoryRule.getRepository(), null);

        Assert.assertEquals(3, resultMap.size());
        Assert.assertEquals(IRI1_LABEL_EN, resultMap.get(asIRI(IRI1)).get().stringValue());
        Assert.assertEquals(IRI2_LABEL_EN, resultMap.get(asIRI(IRI2)).get().stringValue());
        Assert.assertEquals(IRI3_LABEL_FR, resultMap.get(asIRI(IRI3)).get().stringValue());

    }

    @Test
    public void testSingleLabelSingeLanguageMultipleResources03() throws Exception {

        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);

        // IRI2 and IRI3 missing

        final Map<IRI, Optional<Literal>> resultMap = labelCache.getLabels(asIRIList(IRI1, IRI2, IRI3),
                repositoryRule.getRepository(), null);

        Assert.assertEquals(3, resultMap.size());
        Assert.assertEquals(IRI1_LABEL_EN, resultMap.get(asIRI(IRI1)).get().stringValue());
        Assert.assertFalse(resultMap.get(asIRI(IRI2)).isPresent());
        Assert.assertFalse(resultMap.get(asIRI(IRI3)).isPresent());

    }

    @Test
    public void testMultipleLabelsSingleLanguageSingleResource01() throws Exception {

        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs, custom, skos
        setPreferredLanguageDe();

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");
        addIri1EnLiteral(asIRI(CUSTOM_LABEL), IRI1_LABEL_EN + "-cust");

        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1DeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_DE + "-skos");
        addIri1DeLiteral(asIRI(CUSTOM_LABEL), IRI1_LABEL_DE + "-cust");

        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU + "-rdfs");
        addIri1RuLiteral(SKOS.ALT_LABEL, IRI1_LABEL_RU + "-skos");
        addIri1RuLiteral(asIRI(CUSTOM_LABEL), IRI1_LABEL_RU + "-cust");

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG + "-rdfs");
        addIri1NoLangTypeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_NOLANG + "-skos");
        addIri1NoLangTypeLiteral(asIRI(CUSTOM_LABEL), IRI1_LABEL_NOLANG + "-cust");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE + "-rdfs", label.get().stringValue());

    }

    @Test
    public void testMultipleLabelsSingleLanguageSingleResource02() throws Exception {

        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs, custom, skos
        setPreferredLanguageDe();

        // SKOS label to be preferred because of better language tag
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1DeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_DE + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE + "-skos", label.get().stringValue());

    }

    @Test
    public void testMultipleLabelsSingleLanguageSingleResource03() throws Exception {

        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageDe();

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1DeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_DE + "-skos");
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE + "-rdfs", label.get().stringValue());

    }

    @Test
    public void testGetLabelWithFallbackLocalName() throws Exception {
        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        // whatever the default will be, it should return the label
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
        Assert.assertEquals(IRI1_LABEL_NOLANG, LabelCache.resolveLabelWithFallback(label, asIRI(IRI1)));

        // no label
        final Optional<Literal> label2 = labelCache.getLabel(asIRI(IRI2), repositoryRule.getRepository(), null);

        // => optional not present
        Assert.assertFalse(label2.isPresent());
        // resolveLabelWithFallback should return local name
        Assert.assertEquals(asIRI(IRI2).getLocalName(), LabelCache.resolveLabelWithFallback(label2, asIRI(IRI2)));

        // no label
        final Optional<Literal> label3 = labelCache.getLabel(asIRI(CUSTOM_NAMESPACE), repositoryRule.getRepository(),
                null);

        // => optional not present
        Assert.assertFalse(label3.isPresent());
        // no local name
        Assert.assertEquals("", asIRI(CUSTOM_NAMESPACE).getLocalName());
        // resolveLabelWithFallback should return the iri as string
        Assert.assertEquals(CUSTOM_NAMESPACE, LabelCache.resolveLabelWithFallback(label3, asIRI(CUSTOM_NAMESPACE)));

    }

    @Test
    public void testMultipleLabelsMultipleLanguageMultipleResource() throws Exception {

        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageEnNoneDe(); // en > none > de

        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU + "-rdfs");
        addIri1DeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_DE + "-skos");
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1NoLangTypeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_NOLANG); // best match due to language tag

        addIri2EnLiteral(asIRI("http://p"), IRI2_LABEL_EN);
        addIri2DeLiteral(asIRI("http://p"), IRI2_LABEL_DE);
        addIri2RuLiteral(asIRI(CUSTOM_LABEL), IRI2_LABEL_RU); // only one matching ant of the labels

        addIri3EnLiteral(asIRI("http://p"), IRI3_LABEL_EN);
        addIri3DeLiteral(asIRI("http://p"), IRI3_LABEL_DE);

        final Map<IRI, Optional<Literal>> resultMap = labelCache.getLabels(asIRIList(IRI1, IRI2, IRI3),
                repositoryRule.getRepository(), null);

        Assert.assertEquals(3, resultMap.size());
        Assert.assertEquals(IRI1_LABEL_NOLANG, resultMap.get(asIRI(IRI1)).get().stringValue());
        Assert.assertEquals(IRI2_LABEL_RU, resultMap.get(asIRI(IRI2)).get().stringValue());
        Assert.assertFalse(resultMap.get(asIRI(IRI3)).isPresent());
    }

    @Test
    public void testConstructLabelQuery() {

        List<IRI> iris = Lists.newArrayList(asIRI(IRI1), asIRI(IRI2));

        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        NamespaceRegistry namespaceRegistry = namespaceRule.getNamespaceRegistry();

        List<PropertyPattern> preferredLabels = Lists.newArrayList(RDFS.LABEL, SKOS.ALT_LABEL).stream()
                .map(label -> PropertyPattern.parse(renderer.renderValue(label), namespaceRegistry))
                .collect(Collectors.toList());

        final String query = ResourcePropertyCache.constructPropertyQuery(iris, preferredLabels);

        final String expectedQuery = "SELECT ?subject ?p0 ?p1 WHERE {"
                + "{{?subject <http://www.w3.org/2000/01/rdf-schema#label> ?p0 .}}" + "UNION"
                + "{{?subject <http://www.w3.org/2004/02/skos/core#altLabel> ?p1.}}"
                + "VALUES (?subject) { (<http://my.custom.namespace/s1>)(<http://my.custom.namespace/s2>) }" + "}";

        Assert.assertEquals(expectedQuery.replace(" ", ""), query.replaceAll("[\t\n ]", ""));
    }

    @Test
    public void testAssetRepositoryQuery() throws Exception {
        setPreferredLabelRdfsLabel(); // only rdfs:label considered as label
        setPreferredLanguageEn();

        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);
        addIri2NoLangTypeLiteral(RDFS.LABEL, IRI2_LABEL_NOLANG);
        addAssetStatements(vf.createStatement(asIRI(IRI2), RDFS.LABEL, vf.createLiteral(IRI2_LABEL_EN)),
                vf.createStatement(asIRI(IRI3), RDFS.LABEL, vf.createLiteral(IRI3_LABEL_EN)));

        Optional<Literal> label1 = labelCache.getLabel(asIRI(IRI1), repositoryRule.getAssetRepository(), null);
        Optional<Literal> label2 = labelCache.getLabel(asIRI(IRI2), repositoryRule.getAssetRepository(), null);
        Optional<Literal> label3 = labelCache.getLabel(asIRI(IRI3), repositoryRule.getAssetRepository(), null);

        Assert.assertFalse(label1.isPresent());

        Assert.assertTrue(label2.isPresent());
        Assert.assertEquals(IRI2_LABEL_EN, label2.get().stringValue());

        Assert.assertTrue(label3.isPresent());
        Assert.assertEquals(IRI3_LABEL_EN, label3.get().stringValue());
    }

    @Test
    public void testOverrideByUserPreferredLanguage() throws Exception {
        setPreferredLabelRdfsLabel();
        setPreferredLanguageEn();

        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);

        // language priority: de > en
        Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), "de");

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE, label.get().stringValue());
    }

    @Test
    public void testDefaultFallbackForUserPreferredLanguage() throws Exception {
        setPreferredLabelRdfsLabel();
        setPreferredLanguageDe();

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN);
        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR);
        addIri1NoLangTypeLiteral(RDFS.LABEL, IRI1_LABEL_NOLANG);

        // language priority: ru > de
        Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), "ru");

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testSystemFallbackForUserPreferredLanguage() throws Exception {
        setPreferredLabelRdfsLabel();
        setPreferredLanguageEnNoneDe(); // en > none > de

        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR);
        addIri1RuLiteral(RDFS.LABEL, IRI1_LABEL_RU);
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE);

        // language priority: ja > en > none > de
        Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), "ja");

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE, label.get().stringValue());
    }

    @Test
    public void testPropertyPath() throws Exception {
        BNode intermediate1 = vf.createBNode();
        BNode intermediate2 = vf.createBNode();
        addStatement(vf.createStatement(vf.createIRI(IRI1), RDFS.LABEL, intermediate1));
        addStatement(vf.createStatement(intermediate1, SKOS.PREF_LABEL, intermediate2));
        addStatement(vf.createStatement(intermediate2, SKOS.PREF_LABEL, vf.createLiteral(IRI1_LABEL_NOLANG)));

        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        String propertyPath = renderer.renderValue(RDFS.LABEL) + "/" + renderer.renderValue(SKOS.PREF_LABEL) + "+";
        setUIConfigurationParameter("preferredLabels", propertyPath);

        Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    @Test
    public void testPropertyPattern() throws Exception {
        BNode intermediate1 = vf.createBNode();
        BNode intermediate2 = vf.createBNode();
        addStatement(vf.createStatement(vf.createIRI(IRI1), RDFS.LABEL, intermediate1));
        addStatement(vf.createStatement(intermediate1, SKOS.PREF_LABEL, intermediate2));
        addStatement(vf.createStatement(intermediate2, SKOS.PREF_LABEL, vf.createLiteral(IRI1_LABEL_NOLANG)));

        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        String propertyPattern = "{?subject " + renderer.renderValue(RDFS.LABEL) + "?some ." + "?some "
                + renderer.renderValue(SKOS.PREF_LABEL) + "+ ?value .}";
        setUIConfigurationParameter("preferredLabels", propertyPattern);

        Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);
        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_NOLANG, label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: "label (de)" (worse language match)
     * - SKOS.ALT_LABEL: "label (en)" (better language match)
     * 
     * Expectation:
     * The RDFS.LABEL (de) should be chosen because RDFS.LABEL has higher property priority,
     * overriding the better language match of SKOS.ALT_LABEL.
     */
    @Test
    public void testPreferPropertyStrategy01() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageEn(); // en

        // RDFS label has worse language match (de) than SKOS label (en)
        // But PREFER_PROPERTY should pick RDFS label because it is first in preferredLabels list
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: (missing)
     * - SKOS.ALT_LABEL: "label (en)"
     * 
     * Expectation:
     * The SKOS.ALT_LABEL (en) should be chosen because the higher priority property (RDFS.LABEL)
     * is missing.
     */
    @Test
    public void testPreferPropertyStrategy02() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageEn(); // en

        // RDFS label is missing. SKOS label (en) is present.
        // Should pick SKOS label.
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_EN + "-skos", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: "label (de)", "label (en)"
     * - SKOS.ALT_LABEL: "label (en)"
     * 
     * Expectation:
     * The RDFS.LABEL (en) should be chosen because RDFS.LABEL has higher property priority,
     * and within that property, "en" matches the preferred language.
     */
    @Test
    public void testPreferPropertyStrategy03() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageEn(); // en

        // RDFS label has both DE and EN. SKOS has EN.
        // Should pick RDFS label (EN) because RDFS is preferred, and within RDFS, EN is preferred.
        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_EN + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: "label (fr)" (language not in preferred list)
     * - SKOS.ALT_LABEL: "label (en)" (preferred language)
     * 
     * Expectation:
     * The RDFS.LABEL (fr) should be chosen because RDFS.LABEL has higher property priority
     * and contains a value, even if the language is not preferred.
     */
    @Test
    public void testPreferPropertyStrategy04() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setPreferredLanguageEn(); // en

        // RDFS label has FR (not in preferred list). SKOS label has EN.
        // PREFER_PROPERTY should pick RDFS because it is higher priority property and has a value,
        // even if the language is not preferred.
        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_FR + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected with multiple preferred languages.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en, fr, de
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: "label (de)" (3rd preferred language)
     * - SKOS.ALT_LABEL: "label (en)" (1st preferred language)
     * 
     * Expectation:
     * The RDFS.LABEL (de) should be chosen.
     * Even though SKOS has a better language match (en is #1, de is #3),
     * RDFS is the higher priority property. In PREFER_PROPERTY mode,
     * property priority takes precedence over language priority between properties.
     */
    @Test
    public void testPreferPropertyStrategy05_MultiLang() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "fr", "de"));

        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_DE + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected with multiple preferred languages.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en, fr, de
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: "label (de)" (3rd pref lang), "label (fr)" (2nd pref lang)
     * - SKOS.ALT_LABEL: "label (en)" (1st pref lang)
     * 
     * Expectation:
     * The RDFS.LABEL (fr) should be chosen.
     * RDFS is selected (highest priority property).
     * Within RDFS, "fr" (rank 2) is preferred over "de" (rank 3).
     * The SKOS label (en, rank 1) is ignored because it's on a lower priority property.
     */
    @Test
    public void testPreferPropertyStrategy06_MultiLang() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "fr", "de"));

        addIri1DeLiteral(RDFS.LABEL, IRI1_LABEL_DE + "-rdfs");
        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR + "-rdfs");
        addIri1EnLiteral(SKOS.ALT_LABEL, IRI1_LABEL_EN + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_FR + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected with multiple preferred languages.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en, fr, de
     * - strategy: PREFER_PROPERTY
     * 
     * Data:
     * - RDFS.LABEL: (missing)
     * - SKOS.ALT_LABEL: "label (de)" (3rd pref lang), "label (fr)" (2nd pref lang)
     * 
     * Expectation:
     * The SKOS.ALT_LABEL (fr) should be chosen.
     * RDFS is missing, so it falls back to SKOS.
     * Within SKOS, "fr" (rank 2) is preferred over "de" (rank 3).
     */
    @Test
    public void testPreferPropertyStrategy07_MultiLang() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "fr", "de"));

        addIri1DeLiteral(SKOS.ALT_LABEL, IRI1_LABEL_DE + "-skos");
        addIri1FrLiteral(SKOS.ALT_LABEL, IRI1_LABEL_FR + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), null);

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_FR + "-skos", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected and a preferred language is passed to getLabel.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en, de
     * - strategy: PREFER_PROPERTY
     * 
     * Call: getLabel(..., "fr")
     * Effective Language Priority: fr, en, de
     * 
     * Data:
     * - RDFS.LABEL: "label (en)" (2nd pref lang), "label (fr)" (1st pref lang)
     * - SKOS.ALT_LABEL: "label (fr)" (1st pref lang)
     * 
     * Expectation:
     * The RDFS.LABEL (fr) should be chosen.
     * RDFS is the highest priority property.
     * Within RDFS, "fr" matches the passed preferred language (rank 0), so it is chosen over "en".
     */
    @Test
    public void testPreferPropertyStrategy08_OverrideLang() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "de"));

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1FrLiteral(RDFS.LABEL, IRI1_LABEL_FR + "-rdfs");
        addIri1FrLiteral(SKOS.ALT_LABEL, IRI1_LABEL_FR + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), "fr");

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_FR + "-rdfs", label.get().stringValue());
    }

    /**
     * Test logic when PREFER_PROPERTY strategy is selected and a preferred language is passed to getLabel.
     * 
     * Config:
     * - preferredLabels: RDFS.LABEL, SKOS.ALT_LABEL
     * - preferredLanguages: en, de
     * - strategy: PREFER_PROPERTY
     * 
     * Call: getLabel(..., "fr")
     * Effective Language Priority: fr, en, de
     * 
     * Data:
     * - RDFS.LABEL: "label (en)" (2nd pref lang)
     * - SKOS.ALT_LABEL: "label (fr)" (1st pref lang)
     * 
     * Expectation:
     * The RDFS.LABEL (en) should be chosen.
     * RDFS is the highest priority property. It has a label.
     * Even though SKOS has a better language match ("fr"), property priority takes precedence.
     */
    @Test
    public void testPreferPropertyStrategy09_OverrideLang_PropertyPriority() throws Exception {
        setPreferredLabelsResolutionStrategyProperty();
        setPreferredLabelRdfsLabelSkosLabelCustomLabel(); // rdfs > skos > custom
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "de"));

        addIri1EnLiteral(RDFS.LABEL, IRI1_LABEL_EN + "-rdfs");
        addIri1FrLiteral(SKOS.ALT_LABEL, IRI1_LABEL_FR + "-skos");

        final Optional<Literal> label = labelCache.getLabel(asIRI(IRI1), repositoryRule.getRepository(), "fr");

        Assert.assertTrue(label.isPresent());
        Assert.assertEquals(IRI1_LABEL_EN + "-rdfs", label.get().stringValue());
    }

    @Test
    @Ignore
    public void testPerformance() throws Exception {

        String endpoint = "https://query.wikidata.org/sparql";

        // optionally activate more complex preferredLabels
//        List<String> preferredLabels = Lists.newArrayList("<http://www.w3.org/2000/01/rdf-schema#label>",
//                "^<http://wikiba.se/ontology#directClaim>/<http://www.w3.org/2000/01/rdf-schema#label>");
//        setUIConfigurationParameter("preferredLabels", preferredLabels);

        System.out.println("Running benchmark on " + endpoint);

        for (int nResources : Lists.newArrayList(10, 100, 1000, 5000, 10000, 50000)) {

            System.out.println();
            runBenchmark(endpoint, nResources);
            getUnderlyingCache().invalidate();
        }

    }

    protected void runBenchmark(String endpoint, int nResources) throws Exception {

        Repository repo = new SPARQLRepository(endpoint);
        repo.init();

        Set<IRI> resources = Sets.newHashSet();
        try (RepositoryConnection conn = repo.getConnection()) {
            TupleQuery tq = conn.prepareTupleQuery("PREFIX wdt: <http://www.wikidata.org/prop/direct/>\n"
                    + "PREFIX wd: <http://www.wikidata.org/entity/>\n"
                    + "SELECT ?person WHERE { ?person wdt:P31 wd:Q5 . } LIMIT " + nResources);

            try (TupleQueryResult tqr = tq.evaluate()) {
                while (tqr.hasNext()) {
                    BindingSet b = tqr.next();
                    resources.add((IRI) b.getValue("person"));
                }
            }
        }

        System.out.println("Benchmark with " + resources.size() + " resources");

        Stopwatch watch = Stopwatch.createStarted();

        labelCache.getLabels(resources, repo, "en");
        System.out.println("Duration [Labels Retrieved]: " + watch.elapsed(TimeUnit.MILLISECONDS) + "ms");

        watch = Stopwatch.createStarted();

        // from cache
        labelCache.getLabels(resources, repo, "en");
        System.out.println("Duration [Labels retrieved (from cache)]: " + watch.elapsed(TimeUnit.MILLISECONDS) + "ms");

        // invalidate every second item
        ResourcePropertyCache<Object, Literal> underlyingCache = getUnderlyingCache();
        AtomicInteger i = new AtomicInteger(0);
        underlyingCache.invalidate(
                resources.stream().filter(iri -> (i.incrementAndGet() % 2 == 0)).collect(Collectors.toSet()));

        watch = Stopwatch.createStarted();

        labelCache.getLabels(resources, repo, "en");
        System.out.println(
                "Duration [Labels retrieved (50% invalidated)]: " + watch.elapsed(TimeUnit.MILLISECONDS) + "ms");

        repo.shutDown();
    }

    @SuppressWarnings("unchecked")
    protected ResourcePropertyCache<Object, Literal> getUnderlyingCache() throws Exception {
        // use reflection, as field is not visible
        Field f = LabelCache.class.getDeclaredField("cache");
        f.setAccessible(true);
        return (ResourcePropertyCache<Object, Literal>) f.get(labelCache);
    }

    void setPreferredLabelsResolutionStrategyProperty() {
        setUIConfigurationParameter("preferredLabelsResolutionStrategy", "PREFER_PROPERTY");
    }

    void setPreferredLabelRdfsLabel() {
        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        String preferredLabel = renderer.renderValue(RDFS.LABEL);
        setUIConfigurationParameter("preferredLabels", preferredLabel);
    }

    void setPreferredLabelRdfsLabelSkosLabelCustomLabel() {
        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();
        IRI mynsLabel = vf.createIRI(CUSTOM_LABEL);
        List<String> preferredLabels = Stream.of(RDFS.LABEL, SKOS.ALT_LABEL, mynsLabel).map(renderer::renderValue)
                .collect(Collectors.toList());
        setUIConfigurationParameter("preferredLabels", preferredLabels);
    }

    void setPreferredLanguageEn() {
        setUIConfigurationParameter("preferredLanguages", "en");
    }

    void setPreferredLanguageDe() {
        setUIConfigurationParameter("preferredLanguages", "de");
    }

    void setPreferredLanguageRu() {
        setUIConfigurationParameter("preferredLanguages", "ru");
    }

    void setPreferredLanguageEnNoneDe() {
        setUIConfigurationParameter("preferredLanguages", Lists.newArrayList("en", "", "de"));
    }

    private void setUIConfigurationParameter(String name, String value) {
        setUIConfigurationParameter(name, Collections.singletonList(value));
    }

    private void setUIConfigurationParameter(String name, List<String> values) {
        try {
            config.getUiConfig().setParameter(name, values, TestPlatformStorage.STORAGE_ID);
        } catch (UnknownConfigurationException e) {
            throw new RuntimeException(e);
        }
    }

    void addIri1EnLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI1), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_EN)));
    }

    void addIri1DeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI1), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_DE)));
    }

    void addIri1RuLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI1), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_RU)));
    }

    void addIri1FrLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI1), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_FR)));
    }

    void addIri1NoLangTypeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI1), prop, vf.createLiteral(literalValue)));
    }

    void addIri2EnLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI2), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_EN)));
    }

    void addIri2DeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI2), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_DE)));
    }

    void addIri2RuLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI2), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_RU)));
    }

    void addIri2FrLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI2), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_FR)));
    }

    void addIri2NoLangTypeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI2), prop, vf.createLiteral(literalValue)));
    }

    void addIri3EnLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI3), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_EN)));
    }

    void addIri3DeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI3), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_DE)));
    }

    void addIri3RuLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI3), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_RU)));
    }

    void addIri3FrLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI3), prop, vf.createLiteral(literalValue, LANGUAGE_TAG_FR)));
    }

    void addIri3NoLangTypeLiteral(final IRI prop, final String literalValue) throws Exception {
        addStatement(vf.createStatement(vf.createIRI(IRI3), prop, vf.createLiteral(literalValue)));
    }

    IRI asIRI(String iri) {
        return vf.createIRI(iri);
    }

    List<IRI> asIRIList(final String... strings) {

        final List<IRI> ret = new ArrayList<IRI>(strings.length);
        for (int i = 0; i < strings.length; i++) {
            ret.add(asIRI(strings[i]));
        }

        return ret;
    }

}
