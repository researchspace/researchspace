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

package com.metaphacts.federation.repository.optimizers;

import static org.junit.Assert.assertThat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.hamcrest.Matchers;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import com.google.common.collect.Maps;
import com.metaphacts.sail.rest.wikidata.WikidataSail;
import com.metaphacts.sail.rest.wikidata.WikidataSailConfig;
import com.metaphacts.sail.rest.wikidata.WikidataSailFactory;
import com.metaphacts.federation.repository.optimizers.MpFederationServiceClauseOptimizer;
import com.metaphacts.federation.repository.service.ServiceDescriptor;
import com.metaphacts.federation.repository.service.ServiceDescriptorParserTest;
import com.metaphacts.federation.sparql.FederationSparqlAlgebraUtils;
import com.metaphacts.repository.MpRepositoryVocabulary;
import com.metaphacts.sparql.renderer.MpSparqlQueryRendererTest;

import com.google.common.collect.Lists;

public class MpFederationServiceClauseOptimizerTest {

    Map<IRI, Repository> serviceMappings;

    ValueFactory vf = SimpleValueFactory.getInstance();

    Repository wikidataRepo;

    Repository mainRepo;
    RepositoryConnection mainMember;
    
    private String loadQuery(String queryId) throws Exception {
        BufferedReader reader = new BufferedReader(
                new InputStreamReader(MpSparqlQueryRendererTest.class
                    .getResourceAsStream(queryId + ".sq"), "UTF-8"));
        StringBuilder textBuilder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            textBuilder.append(line + "\n");
        }
        return textBuilder.toString().trim();
    }

    @Before
    public void setup() throws Exception {
        serviceMappings = Maps.newHashMap();

        Model model = Rio.parse(
                ServiceDescriptorParserTest.class.getResourceAsStream("wikidata-text.ttl"), "",
                RDFFormat.TURTLE);

        IRI rootNode = Models
                .subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();

        ServiceDescriptor serviceDescriptor = new ServiceDescriptor();

        serviceDescriptor.parse(model, rootNode);

        WikidataSailConfig sailConfig = new WikidataSailConfig();

        WikidataSailFactory factory = new WikidataSailFactory();

        WikidataSail wikidataSail = (WikidataSail) factory.getSail(sailConfig);
        wikidataSail.setServiceDescriptor(serviceDescriptor);
        wikidataRepo = new SailRepository(wikidataSail);

        mainRepo = new SailRepository(new MemoryStore());
        mainRepo.initialize();
        mainMember = mainRepo.getConnection();

        serviceMappings.put(vf.createIRI("http://www.metaphacts.com/wikidata/"), wikidataRepo);
    }

    @After
    public void tearDown() {
        mainMember.close();
        mainRepo.shutDown();
        wikidataRepo.shutDown();
    }

    @Test
    public void testOptimizer() throws Exception {
        String sQuery = loadQuery("simpleQueryWithWikidataSearchService");

        ParsedTupleQuery query = (ParsedTupleQuery) QueryParserUtil.parseQuery(QueryLanguage.SPARQL,
                sQuery, null);

        MpFederationServiceClauseOptimizer optimizer = new MpFederationServiceClauseOptimizer(
                Lists.newArrayList(mainMember), mainMember, serviceMappings, new QueryHintsSetup());

        optimizer.optimize(query.getTupleExpr(), null, null);

        Set<Var> inputVars = FederationSparqlAlgebraUtils.getInputVars(query.getTupleExpr());

        Assert.assertEquals(1, inputVars.size());

        inputVars.stream().filter(var -> !var.hasValue())
                .forEach(var -> Assert.fail("Variable " + var.getName() + " doesn't have value"));

        Set<String> outputVarNames = FederationSparqlAlgebraUtils
                .getOutputBindingNames(query.getTupleExpr());

        assertThat(outputVarNames,
                Matchers.containsInAnyOrder("myUri", "myrank", "comment", "mylabel"));

    }
    
    @Test
    public void testWithRank() {
        
    }

}