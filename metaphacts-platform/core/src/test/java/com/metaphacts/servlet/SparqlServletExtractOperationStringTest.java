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

package com.metaphacts.servlet;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.BufferedReader;
import java.io.StringReader;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.HttpMethod;

import org.apache.http.entity.ContentType;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.mockito.MockitoAnnotations;

import com.google.inject.Inject;
import com.google.inject.Injector;
import com.metaphacts.junit.AbstractIntegrationTest;


/**
 * To extraction of query string from the request according to the standard:
 * http://www.w3.org/TR/sparql11-protocol/#query-operation
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SparqlServletExtractOperationStringTest extends AbstractIntegrationTest {
    
    private String query = "Select * WHERE {?subject ?predicate ?object}";
    private String update = "INSERT{<http://www.metaphacts.com/resource/Joe> a <http://xmlns.com/foaf/0.1/Person>} WHERE {?subject ?predicate ?object} LIMIT 1";
    
    SparqlServlet servlet;
    
    @Inject
    Injector injector;
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        servlet = injector.getInstance(SparqlServlet.class);
    }
    
    @Test
    public void testGet() throws Exception {
       
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getMethod()).thenReturn(HttpMethod.GET);
        when(req.getParameter("query")).thenReturn(query);
        
        Assert.assertEquals(query, servlet.getQueryStringFromGet(req).get());
    }

    @Test
    public void testQueryPostFormUrlEncoded() throws Exception {
        
        HttpServletRequest req = mock(HttpServletRequest.class);
        
        when(req.getMethod()).thenReturn(HttpMethod.POST);
        when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
        when(req.getParameter("query")).thenReturn(query);
        
        Assert.assertEquals(query, servlet.getOperationStringFromPost(req).get());
    }

    @Test
    public void testUpdatePostFormUrlEncoded() throws Exception {
        
        HttpServletRequest req = mock(HttpServletRequest.class);
        
        when(req.getMethod()).thenReturn(HttpMethod.POST);
        when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
        when(req.getParameter("update")).thenReturn(update);
        
        Assert.assertEquals(update, servlet.getOperationStringFromPost(req).get());
    }
    
    @Test
    public void testQueryPostInBody() throws Exception {
        
        HttpServletRequest req = mock(HttpServletRequest.class);
        
        when(req.getMethod()).thenReturn(HttpMethod.POST);
        when(req.getContentType()).thenReturn("application/sparql-query");
        when(req.getReader()).thenReturn(new BufferedReader(new StringReader(query)));
        
        Assert.assertEquals(query, servlet.getOperationStringFromPost(req).get());
    }

    @Test
    public void testUpdatePostInBody() throws Exception {
        
        HttpServletRequest req = mock(HttpServletRequest.class);
        
        when(req.getMethod()).thenReturn(HttpMethod.POST);
        when(req.getContentType()).thenReturn("application/sparql-update");
        when(req.getReader()).thenReturn(new BufferedReader(new StringReader(update)));
        
        Assert.assertEquals(update, servlet.getOperationStringFromPost(req).get());
    }
}