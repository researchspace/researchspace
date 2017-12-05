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

package com.metaphacts.templates;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import javax.ws.rs.HttpMethod;
import javax.ws.rs.core.Application;

import com.metaphacts.cache.LabelCache;
import com.metaphacts.data.rdf.container.*;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringEscapeUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.glassfish.jersey.internal.MapPropertiesDelegate;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTest;
import org.hamcrest.CoreMatchers;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;

import com.github.jknack.handlebars.HandlebarsException;
import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.inject.Inject;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.junit.MetaphactsGuiceTestModule;
import com.metaphacts.junit.NamespaceRule;
import com.metaphacts.junit.RepositoryRule;
import com.metaphacts.junit.TestUtils;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@RunWith(JukitoRunner.class)
@UseModules(MetaphactsGuiceTestModule.class)
public class MetaphactsHandlebarsTest  extends JerseyTest {

    @Inject
    @Rule
    public RepositoryRule repositoryRule;

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    @Rule
    public ShiroRule shiroRule = new ShiroRule();

    @Rule
    public ExpectedException exception= ExpectedException.none();

    @Inject
    private LabelCache labelCache;

    private MetaphactsHandlebars handlebars;

    private final ValueFactory vf = SimpleValueFactory.getInstance();

    final ContainerRequest containerRequest = new ContainerRequest( URI.create(""),
            URI.create("/?testParam=test123"), HttpMethod.GET,
            null, new MapPropertiesDelegate());

    private final String thisIriString = "http://www.metaphacts.com/handlebars";

    private final String nsForNamespaceTest = "http://www.metaphacts.com/test/";

    @Before
    public void setup() throws Exception {
        NamespaceRegistry ns = namespaceRule.getNamespaceRegistry();
        ns.set("helperTest", nsForNamespaceTest);
        Assert.assertTrue(ns.getNamespace("helperTest").isPresent());

        handlebars = new MetaphactsHandlebars(null, new HandlebarsHelperRegistry(labelCache, ns, repositoryRule.getRepositoryManager()));
        try(RepositoryConnection con = repositoryRule.getRepository().getConnection()){
            con.add(vf.createStatement(vf.createIRI("http://a"),vf.createIRI("http://b"),vf.createIRI("http://c")));
        }
    }

    @After
    public void tearDown() throws Exception {
        repositoryRule.delete();
    }

    @Override
    protected Application configure() {
        return new ResourceConfig();
    }

    @Test
    public void simpleInlineTestWithoutContext() throws Exception{
        Assert.assertEquals("Test", handlebars.compileInline("Test").apply(null));
    }

    @Test
    public void simpleInlineTestWithTemplateContext() throws Exception{
        Assert.assertEquals("Test: "+thisIriString, handlebars.compileInline("Test: [[this]]").apply(context(vf.createIRI(thisIriString))));
    }

    @Test
    public void urlParamHelperTest() throws Exception{
        // simple param value extraction
        Assert.assertEquals("Test: test123", handlebars.compileInline("Test: [[urlParam \"testParam\"]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return true if parameter does not exist
        Assert.assertEquals("Test: True", handlebars.compileInline("Test: [[#if (urlParam \"testParam\")]]True[[/if]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return false if parameter does not exist
        Assert.assertEquals("Test: False", handlebars.compileInline("Test: [[#if (urlParam \"notExistingParam\")]]True[[else]]False[[/if]]").apply(context(vf.createIRI(thisIriString))));

    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void askHelperTest() throws Exception{
        // true ASK to return non string (which will be evaluated to false in if expressions)
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{<http://a> <http://b>  <http://c>.}\"]]").apply(context(vf.createIRI(thisIriString))));

        // false ASK to return empty string (which will be evaluated to true in if expressions)
        Assert.assertEquals("", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. FILTER(true=false)}\"]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return true
        Assert.assertEquals("Test: True", handlebars.compileInline("Test: [[#if (ask \"ASK{<http://a> <http://b>  <http://c>.}\")]]True[[/if]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return false
        Assert.assertEquals("Test: False", handlebars.compileInline("Test: [[#if (ask \"ASK{?a ?b ?c. FILTER(true=false)}\")]]True[[else]]False[[/if]]").apply(context(vf.createIRI(thisIriString))));

        // prefixes are being resolved in the query i.e. should not fail with an exception
        Assert.assertEquals("", handlebars.compileInline("[[ask \"ASK{?a helperTest:broader ?c. FILTER(true=false)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // test user parameterization
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. BIND(?__useruri__ as ?test). FILTER(BOUND(?test))}\"]]").apply(context(vf.createIRI(thisIriString))));
        String userIriString = namespaceRule.getNamespaceRegistry().getUserIRI().stringValue();
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. FILTER(?__useruri__ = <" +userIriString+ ">)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // test this parameterization
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. BIND(?__this__ as ?test). FILTER(BOUND(?test))}\"]]").apply(context(vf.createIRI(thisIriString))));
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. FILTER(?__this__ = <" +thisIriString+ ">)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // test user parameterization
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. BIND(?? as ?test). FILTER(BOUND(?test))}\"]]").apply(context(vf.createIRI(thisIriString))));
        Assert.assertEquals("true", handlebars.compileInline("[[ask \"ASK{?a ?b ?c. FILTER(?? = <" +thisIriString+ ">)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // test unknown prefix exception case
        // note: can't use exception rule here, since runner collects into MultipleFailureException
        Exception exception = null;
        try{
            handlebars.compileInline("[[ask \"ASK{?a helperTest:broader ?c. FILTER NOT EXISTS {?x unkownPrefix:broader ?y.} FILTER(true=false)}\"]]").apply(context(vf.createIRI(thisIriString)));
        }catch(Exception e){
            exception = e;
            if(e instanceof HandlebarsException){
                Assert.assertThat(e.getMessage(), CoreMatchers.containsString("QName 'unkownPrefix:broader' uses an undefined prefix"));
            }else{
                Assert.fail("Expected a HandlebarsException");
            }
        }
        Assert.assertNotNull(exception);
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void permissionHelperTest() throws Exception{
        // true ASK to return non string (which will be evaluated to false in if expressions)
        Assert.assertEquals("true", handlebars.compileInline("[[hasPermission \"sparql:query:ask\"]]").apply(context(vf.createIRI(thisIriString))));

        // false ASK to return empty string (which will be evaluated to true in if expressions)
        Assert.assertEquals("", handlebars.compileInline("[[hasPermission \"sparql:update\"]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return true
        Assert.assertEquals("Test: True", handlebars.compileInline("Test: [[#if (hasPermission \"sparql:query:ask\")]]True[[/if]]").apply(context(vf.createIRI(thisIriString))));

        //nested in if expression, should return false
        Assert.assertEquals("Test: False", handlebars.compileInline("Test: [[#if (hasPermission \"sparql:update\")]]True[[else]]False[[/if]]").apply(context(vf.createIRI(thisIriString))));
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void singleValueFromSelectHelperTest() throws Exception{
        // literal
        Assert.assertEquals("a", handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE {BIND(\\\"a\\\" as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // iri
        Assert.assertEquals("http://a", handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE {BIND(<http://a> as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // only first binding, first value
        Assert.assertEquals("http://a1", handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString))));

        // other binding explicitly specified
        Assert.assertEquals("http://b1", handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\" binding=\"b\"]]").apply(context(vf.createIRI(thisIriString))));

        // prefixes are being resolved in the query i.e. should not fail with an exception
        // literal
        Assert.assertEquals("a", handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE {FILTER NOT EXISTS{?x helperTest:broader ?y.} BIND(\\\"a\\\" as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));

     // test this parameterization
        Assert.assertEquals(thisIriString, handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE { BIND(?? as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));
        Assert.assertEquals(thisIriString, handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE { BIND(?__this__ as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));

        // test user parameterization
        String userIriString = namespaceRule.getNamespaceRegistry().getUserIRI().stringValue();
        Assert.assertEquals(userIriString, handlebars.compileInline("[[singleValueFromSelect \"SELECT ?a WHERE { BIND(?__useruri__ as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void jsonValueFromSelectHelperTest() throws Exception{
        // test html  and json encoding, everything else is test through singleValueFromSelectHelperTest
        Assert.assertEquals("\"http:\\/\\/a\"", handlebars.compileInline("[[jsonValueFromSelect \"SELECT ?a WHERE {BIND(<http://a> as ?a)}\"]]").apply(context(vf.createIRI(thisIriString))));

        Assert.assertEquals("null", handlebars.compileInline("[[jsonValueFromSelect \"SELECT ?a WHERE {FILTER(true=false)}\"]]").apply(context(vf.createIRI(thisIriString))));
   }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void jsonArrayFromSelectHelperTest() throws Exception{
        // all iri values from first binding, html  and json encoded
        Assert.assertEquals(
                "[&quot;http:\\/\\/a1&quot;,&quot;http:\\/\\/a2&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // can be decoded
        Assert.assertEquals(
                "[\"http://a1\",\"http://a2\"]",
                StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
                        handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
                ))
        );

        // other binding explicitly specified
        Assert.assertEquals(
                "[&quot;http:\\/\\/b1&quot;,&quot;http:\\/\\/b2&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\" binding=\"b\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // with literals (even though will probably not be used)
        Assert.assertEquals(
                "[&quot;b1&quot;,&quot;b2&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> \\\"b1\\\"^^xsd:string)(<http://a2> \\\"b2\\\"^^xsd:string )}}\" binding=\"b\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // test that prefixes are being resolved
        Assert.assertEquals(
                "[&quot;http:\\/\\/a1&quot;,&quot;http:\\/\\/a2&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {FILTER NOT EXISTS {?x helperTest:broader ?y.} VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // test this parameterization
        Assert.assertEquals(
                "[&quot;http:\\/\\/www.metaphacts.com\\/handlebars&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a WHERE { BIND(?__this__ as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
         );
        Assert.assertEquals(
                "[&quot;http:\\/\\/www.metaphacts.com\\/handlebars&quot;]",
                handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a WHERE { BIND(?? as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // test user parameterization
        String userIriString = namespaceRule.getNamespaceRegistry().getUserIRI().stringValue();
        Assert.assertEquals(
                "[\""+userIriString+"\"]",
                    StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
                            handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a WHERE { BIND(?__useruri__ as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
                    ))
                 );

        // test unknown prefix exception case
        // note: can't use exception rule here, since runner collects into MultipleFailureException
        Exception exception = null;
        try{
            handlebars.compileInline("[[jsonArrayFromSelect \"SELECT ?a ?b WHERE {FILTER NOT EXISTS {?x unkownPrefix:broader ?y.} VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)));
        }catch(Exception e){
            exception = e;
            if(e instanceof HandlebarsException){
                Assert.assertThat(e.getMessage(), CoreMatchers.containsString("QName 'unkownPrefix:broader' uses an undefined prefix"));
            }else{
                Assert.fail("Expected a HandlebarsException");
            }
        }
        Assert.assertNotNull(exception);
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void jsonObjectArrayFromSelectHelperTest() throws Exception{
        // html  and json encoded
        Assert.assertEquals(
                "[{&quot;a&quot;:&quot;http:\\/\\/a1&quot;,&quot;b&quot;:&quot;http:\\/\\/b1&quot;},{&quot;a&quot;:&quot;http:\\/\\/a2&quot;,&quot;b&quot;:&quot;http:\\/\\/b2&quot;}]",
                handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // makes a proper json string, once encoded
        Assert.assertEquals(
                "[{\"a\":\"http://a1\",\"b\":\"http://b1\"},{\"a\":\"http://a2\",\"b\":\"http://b2\"}]",
                StringEscapeUtils.unescapeJson(
                        StringEscapeUtils.unescapeHtml4(handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a ?b WHERE {VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
                ))
        );

        // test that prefixes are being resolved
        Assert.assertEquals(
                "[{&quot;a&quot;:&quot;http:\\/\\/a1&quot;,&quot;b&quot;:&quot;http:\\/\\/b1&quot;},{&quot;a&quot;:&quot;http:\\/\\/a2&quot;,&quot;b&quot;:&quot;http:\\/\\/b2&quot;}]",
                handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a ?b WHERE {FILTER NOT EXISTS {?x helperTest:broader ?y.} VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)))
        );

        // test this parameterization
        Assert.assertEquals(
                "[{&quot;a&quot;:&quot;http:\\/\\/www.metaphacts.com\\/handlebars&quot;}]",
                handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a WHERE { BIND(?__this__ as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
         );

        Assert.assertEquals(
                "[{&quot;a&quot;:&quot;http:\\/\\/www.metaphacts.com\\/handlebars&quot;}]",
                handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a WHERE { BIND(?? as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
         );

        // test user parameterization
        String userIriString = namespaceRule.getNamespaceRegistry().getUserIRI().stringValue();
        Assert.assertEquals(
                "[{\"a\":\""+userIriString+"\"}]",
                    StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
                            handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a WHERE { BIND(?__useruri__ as ?a).  }\"]]").apply(context(vf.createIRI(thisIriString)))
                    ))
                 );

        // test unknown prefix exception case
        // note: can't use exception rule here, since runner collects into MultipleFailureException
        Exception exception = null;
        try{
            handlebars.compileInline("[[jsonObjectArrayFromSelect \"SELECT ?a ?b WHERE {FILTER NOT EXISTS {?x unkownPrefix:broader ?y.} VALUES(?a ?b){(<http://a1> <http://b1> )(<http://a2> <http://b2> )}}\"]]").apply(context(vf.createIRI(thisIriString)));
        }catch(Exception e){
            exception = e;
            if(e instanceof HandlebarsException){
                Assert.assertThat(e.getMessage(), CoreMatchers.containsString("QName 'unkownPrefix:broader' uses an undefined prefix"));
            }else{
                Assert.fail("Expected a HandlebarsException");
            }
        }
        Assert.assertNotNull(exception);
    }

    @Test
    public void resolvePrefixHelperTest() throws Exception{

        // plain prefix
        Assert.assertEquals("Resolve Prefix Test: <"+nsForNamespaceTest+">", handlebars.compileInline("Resolve Prefix Test: <[[resolvePrefix \"helperTest:\"]]>").apply(context(vf.createIRI(thisIriString))));

        // with local name
        Assert.assertEquals("Resolve Prefix Test: <"+nsForNamespaceTest+"LocalName>", handlebars.compileInline("Resolve Prefix Test: <[[resolvePrefix \"helperTest:LocalName\"]]>").apply(context(vf.createIRI(thisIriString))));

        // test unknown prefix exception case
        // note: can't use exception rule here, since runner collects into MultipleFailureException
        Exception exception = null;
        try{
            handlebars.compileInline("Resolve Prefix Test: <[[resolvePrefix \"unkownPrefix:LocalName\"]]>").apply(context(vf.createIRI(thisIriString)));
        }catch(Exception e){
            exception = e;
            if(e instanceof HandlebarsException){
                Assert.assertThat(e.getMessage(), CoreMatchers.containsString("Prefixed IRI unkownPrefix:LocalName is not resolveable to full IRI."));
            }else{
                Assert.fail("Expected a HandlebarsException");
            }
        }
        Assert.assertNotNull(exception);
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void fieldDefinitionsHelperTest() throws Exception{
        LDPApi ldpApi = new LDPApi(repositoryRule.getAssetRepository());

        /*
         * add field definition 1 via dedicated ldp api
         */
        LDPResource field1Res = ldpApi.createLDPResource(
                Optional.of("fieldInstance1"),
                new RDFStream(TestUtils.readPlainTextTurtleInput("/com/metaphacts/templates/FieldDefinitionTest1.ttl"),
                        RDFFormat.TURTLE),
                        FieldDefinitionContainer.IRI,
                        "http://www.metaphacts.com/field/testinstance/"
                );
        /*
         * add field definition 2 via dedicated ldp api
         */
        LDPResource field2Res = ldpApi.createLDPResource(
                Optional.of("fieldInstance2"),
                new RDFStream(TestUtils.readPlainTextTurtleInput("/com/metaphacts/templates/FieldDefinitionTest2.ttl"),
                        RDFFormat.TURTLE),
                        FieldDefinitionContainer.IRI,
                        "http://www.metaphacts.com/field/testinstance/"
                );

        /* general testing existence of the field definition container */
        assertEquals(FieldDefinitionContainer.IRI, field1Res.getParentContainer());
        LDPResource cnt = ldpApi.getLDPResource(FieldDefinitionContainer.IRI);
        assertTrue(cnt instanceof LDPContainer);
        assertTrue(cnt instanceof FieldDefinitionContainer);
        assertEquals(RootContainer.IRI, cnt.getParentContainer());

        /*
         * test to read a single enumerated field definition, where the hashed parameter of the field definition
         * helper function is used to alias the field id
         */
        String expectedDefinition1 = IOUtils.toString(
            MetaphactsHandlebars.class.getResourceAsStream("/com/metaphacts/templates/FieldDefinitionTest1.json"),
            StandardCharsets.UTF_8
        );
        String actualDefinition1 = StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
            handlebars.compileInline("[[fieldDefinitions alias1=\"" + field1Res.getResourceIRI().stringValue() + "\"]]")
                .apply(context(vf.createIRI(thisIriString)))
        ));
        JSONAssert.assertEquals("field definition 1", expectedDefinition1, actualDefinition1, JSONCompareMode.STRICT);

        /*
         * test to read several enumerated field definitions, where the hashed parameters of the field definition
         * helper function is used to alias the field id
         */
        String expectedDefinition2 = IOUtils.toString(
            MetaphactsHandlebars.class.getResourceAsStream("/com/metaphacts/templates/FieldDefinitionTest2.json"),
            StandardCharsets.UTF_8
        );
        String actualDefinition2 = StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
            handlebars.compileInline(
                "[[fieldDefinitions alias1=\"" + field1Res.getResourceIRI().stringValue() + "\" " +
                "alias2=\""+field2Res.getResourceIRI().stringValue()+"\"]]"
            ).apply(context(vf.createIRI(thisIriString)))
        ));
        JSONAssert.assertEquals("field definition 2", expectedDefinition2, actualDefinition2, JSONCompareMode.STRICT);

        /*
         * test to read all field definitions from databases without alias using their global IRI as
         * field id
         */
        String expectedAllDefinitions = IOUtils.toString(
            MetaphactsHandlebars.class.getResourceAsStream("/com/metaphacts/templates/AllFieldDefinitionsTest.json"),
            StandardCharsets.UTF_8
        );
        String actualAllDefinitions = StringEscapeUtils.unescapeJson(StringEscapeUtils.unescapeHtml4(
            handlebars.compileInline("[[fieldDefinitions]]").apply(context(vf.createIRI(thisIriString)))
        ));
        JSONAssert.assertEquals("all field definitions", expectedAllDefinitions, actualAllDefinitions, JSONCompareMode.STRICT);
    }

    @Test
    public void setManagementHelperTest() throws Exception {
        // set container IRI
        Assert.assertEquals(UserSetRootContainer.setContainerIriForUser("foo"),
            handlebars.compileInline("[[setContainerIri username=\"foo\"]]")
            .apply(context(vf.createIRI(thisIriString))));
        // default set IRI
        Assert.assertEquals(UserSetRootContainer.defaultSetIriForUser("bar"),
            handlebars.compileInline("[[defaultSetIri username=\"bar\"]]")
            .apply(context(vf.createIRI(thisIriString))));
    }

    @Test
    @SubjectAware(
        username="guest",
        password="guest",
        configuration = "classpath:com/metaphacts/security/shiro-query-rights.ini"
    )
    public void setManagementUserContextHelperTest() throws Exception {
        // set container IRI
        Assert.assertEquals("http://www.metaphacts.com/ontologies/platform/user/guest/setContainer",
            handlebars.compileInline("[[setContainerIri]]")
            .apply(context(vf.createIRI(thisIriString))));
        // default set IRI
        Assert.assertEquals("http://www.metaphacts.com/ontologies/platform/user/guest/setContainer/Uncategorized",
            handlebars.compileInline("[[defaultSetIri]]")
            .apply(context(vf.createIRI(thisIriString))));
    }

    private TemplateContext context(IRI iri){
        TemplateContext context = new TemplateContext(iri, this.repositoryRule.getRepository(), containerRequest.getUriInfo());
        context.setNamespaceRegistry(namespaceRule.getNamespaceRegistry());
        Assert.assertTrue(context.getNamespaceRegistry().isPresent());
        return context;
    }

}
