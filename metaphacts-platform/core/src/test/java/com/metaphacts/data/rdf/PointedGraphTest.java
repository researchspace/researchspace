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

package com.metaphacts.data.rdf;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;

import com.google.common.collect.Sets;

import org.junit.Before;
import org.junit.Test;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;

import com.google.common.collect.Lists;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class PointedGraphTest {
    

    private ValueFactory vf = SimpleValueFactory.getInstance();
    private  IRI subj = vf.createIRI("http://www.test.de/subject1");   

    private Model model;
    
    @Before
    public void createModel(){
        ArrayList<Statement> stmts = Lists.<Statement>newArrayList(
                vf.createStatement(subj, RDF.TYPE, FOAF.PERSON),
                vf.createStatement(subj, FOAF.FIRST_NAME, vf.createLiteral("Hans")),
                vf.createStatement(subj, FOAF.LAST_NAME, vf.createLiteral("Peter"))
                ) ;
        
        model = new LinkedHashModel(stmts);
    }
    
    @Test
    public void testPointedGraph(){
        PointedGraph pg = new PointedGraph(subj, model);
        model.add(vf.createStatement(subj, RDF.TYPE, FOAF.PERSON));
        assertEquals(subj, pg.getPointer());
        assertTrue(Models.isomorphic(model, pg.getGraph()));
        assertEquals(Sets.<IRI>newLinkedHashSet(Lists.<IRI>newArrayList(FOAF.PERSON)), pg.getTypes());
        
    }

}