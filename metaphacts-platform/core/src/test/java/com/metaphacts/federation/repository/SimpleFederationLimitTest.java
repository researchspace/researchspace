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

package com.metaphacts.federation.repository;

import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.eclipse.rdf4j.sail.federation.Federation;
import org.junit.Test;

import com.google.common.collect.Maps;
import com.metaphacts.federation.repository.MpFederation;

public class SimpleFederationLimitTest {

    public SimpleFederationLimitTest() {
        // TODO Auto-generated constructor stub
    }

    // @Test
    public void testRDF4J() throws Exception {
        SPARQLRepository defaultRepository = new SPARQLRepository("http://wikidata.metaphacts.com/bigdata/sparql");
        defaultRepository.initialize();
        defaultRepository.enableQuadMode(true);
        
        /*RepositoryConnection conn = defaultRepository.getConnection();
        String sQuery = "SELECT * WHERE {?a ?b ?c } LIMIT 1";
        TupleQuery tq = conn.prepareTupleQuery(sQuery);
        TupleQueryResult tqr = tq.evaluate();
        while (tqr.hasNext()) {
            System.out.println(tqr.next());
        }
        tqr.close(); 
        BooleanQuery bq = conn.prepareBooleanQuery("ASK { ?s ?p ?o }");
        bq.evaluate(); */
        
        Federation fed = new Federation();
        fed.addMember(defaultRepository);
        SailRepository fedRep = new SailRepository(fed);
        fedRep.initialize();
        RepositoryConnection fedCon = fedRep.getConnection();
        String sQuery = "SELECT * WHERE {?a ?b ?c } LIMIT 1";
        TupleQuery tq = fedCon.prepareTupleQuery(sQuery);
        TupleQueryResult tqr = tq.evaluate();
        while (tqr.hasNext()) {
            System.out.println(tqr.next());
        }
        tqr.close();
        fedCon.close();
        fedRep.shutDown(); 
    }
    
    // @Test
    public void testMetaphacts() throws Exception {
        SPARQLRepository defaultRepository = new SPARQLRepository("http://wikidata.metaphacts.com/bigdata/sparql");
        defaultRepository.enableQuadMode(true);
        defaultRepository.initialize();
        MpFederation fed = new MpFederation("default", Maps.newHashMap());
        Federation fedRef = (Federation)fed;
        fedRef.addMember(defaultRepository);
        fed.isServiceResolverInitialized = true;
        SailRepository fedRep = new SailRepository(fed);
        fedRep.initialize();
        RepositoryConnection fedCon = fedRep.getConnection();
        String sQuery = "SELECT * WHERE {?a ?b ?c } LIMIT 1";
        TupleQuery tq = fedCon.prepareTupleQuery(sQuery);
        TupleQueryResult tqr = tq.evaluate();
        while (tqr.hasNext()) {
            System.out.println(tqr.next());
        }
        tqr.close();
        fedCon.close();
        fedRep.shutDown();
    }
    
}