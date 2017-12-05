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

import static com.metaphacts.api.transform.ModelUtils.getNotNullObjectLiteral;
import static com.metaphacts.api.transform.ModelUtils.getNotNullObjectIRI;
import static com.metaphacts.api.transform.ModelUtils.getNotNullSubjectIRI;
import static org.hamcrest.CoreMatchers.containsString;
import static org.junit.Assert.assertEquals;

import java.util.ArrayList;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;

import com.google.common.collect.Lists;



public class ModelUtilsTest {
    
    @Rule
    public ExpectedException exception= ExpectedException.none();
    
    private ValueFactory vf = SimpleValueFactory.getInstance();
    
    private IRI subj = vf.createIRI("http://www.test.de/subject1");
    private IRI pred = vf.createIRI("http://www.test.de/predicate1");
    private IRI obj = vf.createIRI("http://www.test.de/object1");
    
    private IRI subj2 = vf.createIRI("http://www.test.de/subject2");
    private IRI pred2 = vf.createIRI("http://www.test.de/predicate2");
    private  Literal obj2 = vf.createLiteral("Hallo");

    private  BNode subj3 = vf.createBNode("bNodeId3");
    private IRI pred3 = vf.createIRI("http://www.test.de/predicate3");
    private  Literal obj3 = vf.createLiteral("Hallo3");
    
    Model model;
    
    @Before
    public void createModel(){
        ArrayList<Statement> stmts = Lists.<Statement>newArrayList(
                vf.createStatement(subj, pred, obj),
                vf.createStatement(subj2, pred2, obj2),
                vf.createStatement(subj3, pred3, obj3)
                ) ;
        
        model = new LinkedHashModel(stmts);
    }
    
    @Test
    public void testGetNotNullSubjectIRI(){
        assertEquals(subj, getNotNullSubjectIRI(model, pred, obj));
    }

    @Test
    public void testGetNotNullSubjectIRI_NullException(){
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("Subject of { ?subject http://www.test.de/predicate1 http://www.test.de/subject1 } is not an IRI or is null."));
        assertEquals(subj, getNotNullSubjectIRI(model, pred, subj));
    }
    
    @Test
    public void testGetNotNullSubjectIRI_NotIRIException(){
        //TODO I think Sesame exception is misleading .. should be "Unexpected subject term"
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("is not an IRI or is null.")); 
        assertEquals(subj, getNotNullSubjectIRI(model, pred3, obj3));
    }
    
    @Test
    public void testGetNotNullObjectIRI(){
        assertEquals(obj, getNotNullObjectIRI(model, subj, pred));
    }

    @Test
    public void testGetNotNullObjectIRI_NullException(){
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("Object of { http://www.test.de/object1 http://www.test.de/predicate1 ?object } is not an IRI or is null"));
        assertEquals(obj, getNotNullObjectIRI(model, obj, pred));
    }

    @Test
    public void testGetNotNullObjectIRI_NotIRIException(){
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("is not an IRI or is null")); 
        assertEquals(obj, getNotNullObjectIRI(model, subj3, pred3));
    }

    @Test
    public void testGetNotNullObjectLiteral(){
        assertEquals(obj2, getNotNullObjectLiteral(model, subj2, pred2));
    }
    
    @Test
    public void testGetNotNullObjectLiteral_NullException(){
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("is not an Literal or is null")); 
        assertEquals(obj2, getNotNullObjectLiteral(model, subj, pred2));
    }

    @Test
    public void testGetNotNullObjectLiteral_NotLiteralException(){
        exception.expect(ModelException.class);
        exception.expectMessage(containsString("is not an Literal or is null.")); 
        assertEquals(obj3, getNotNullObjectLiteral(model, subj, pred));
    }

}