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

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.HttpMethod;
import javax.ws.rs.core.Response.Status;

import com.metaphacts.junit.PlatformStorageRule;
import com.metaphacts.ui.templates.ST;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.http.entity.ContentType;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriter;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterFactory;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterRegistry;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.google.common.collect.Lists;
import com.google.inject.Inject;
import com.google.inject.Injector;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.di.MainGuiceModule.MainTemplateProvider;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.junit.TestUtils;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SparqlServletTest extends AbstractIntegrationTest  {
    @Inject
    private MainTemplateProvider sparqlServletTemplate;
    
    private String selectQuery = "SELECT * WHERE {?a ?b ?c} LIMIT 10";
    private String askQuery = "ASK {?a ?b ?c}";
    private String constructQuery = "CONSTRUCT {?a ?b ?c} WHERE {?a ?b ?c} LIMIT 10";
    private String updateOperation = "INSERT {?a ?b ?c} WHERE {?a ?b ?c}";
    private String standardHTMLAcceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    @Mock
    private HttpServletRequest req;
   
    @Mock
    private HttpServletResponse res;

    @Mock
    private ServletOutputStream outputStream;
    
    @Inject
    SparqlServlet sparqlServlet;
    
    @Rule
    public ShiroRule shiroRule = new ShiroRule();

    @Inject
    @Rule
    public PlatformStorageRule storage;

    @Inject
    Injector injector;
    
    private ValueFactory vf;
    
    private final String sparqlPermissionShiroFile = "classpath:com/metaphacts/security/shiro-query-rights.ini";
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        vf = SimpleValueFactory.getInstance();
        storage.mockPageLayoutTemplate(ST.TEMPLATES.HTML_HEAD);
        storage.mockPageLayoutTemplate(ST.TEMPLATES.MAIN);
    }
    
    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = sparqlPermissionShiroFile
          )
    public void testPostHtmlAcceptHeader() throws Exception {
        when(req.getParameter("query")).thenReturn(selectQuery);
        when(req.getMethod()).thenReturn(HttpMethod.POST);
        when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
        when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(Lists.newArrayList(standardHTMLAcceptHeader)));
        
        when(res.getOutputStream()).thenReturn(outputStream);
        sparqlServlet.doPost(req, res);
        verify(res).setContentType("text/html");

    }

    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = sparqlPermissionShiroFile
            )
    public void testGetHtmlAcceptHeader() throws Exception {
        when(req.getParameter("query")).thenReturn(selectQuery);
        when(req.getMethod()).thenReturn(HttpMethod.GET);
        when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
        when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(Lists.newArrayList(standardHTMLAcceptHeader)));
        
        when(res.getOutputStream()).thenReturn(outputStream);
        sparqlServlet.doPost(req, res);
        verify(res).setContentType("text/html");
        verify(res.getOutputStream()).write(sparqlServletTemplate.get().getBytes("UTF-8"));
    }

    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = sparqlPermissionShiroFile
          )
    public void testSPARQLJsonAcceptHeader() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);

            when(req.getParameter("query")).thenReturn(selectQuery);
            when(req.getMethod()).thenReturn(HttpMethod.POST);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            
            
            verify(res).setContentType(Mockito.contains(TupleQueryResultFormat.JSON.getDefaultMIMEType()));

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            
            try(TupleQueryResult  result = SparqlOperationBuilder.<TupleQuery>create(selectQuery, TupleQuery.class).build(con).evaluate()){
                Optional<TupleQueryResultWriterFactory> qrFactory = TupleQueryResultWriterRegistry.getInstance().get(TupleQueryResultFormat.JSON);
                TupleQueryResultWriter qrWriter =      qrFactory.get().getWriter(baos);
                QueryResults.report(result, qrWriter);
            }
                
            // need to capture the value instead of asserting the equality on the byte array directly ,
            // since we the byte array from the servlet outputstream has trailing zeros 
            ArgumentCaptor<byte[]> captor = ArgumentCaptor.forClass(byte[].class);
            verify(res.getOutputStream()).write(captor.capture(), Mockito.anyInt(), Mockito.anyInt());

            Assert.assertEquals(new String(captor.getValue(), StandardCharsets.UTF_8).trim(),new String(baos.toByteArray(), StandardCharsets.UTF_8).trim());
        }

    }

    @Test
    @SubjectAware(
            username="noPermission",
            password="noPermission",
            configuration = sparqlPermissionShiroFile
            )
    public void testNoSelectPermissionGET() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);
            
            when(req.getParameter("query")).thenReturn(selectQuery);
            when(req.getMethod()).thenReturn(HttpMethod.GET);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            verify(res).sendError(Status.FORBIDDEN.getStatusCode(), "No permission to execute SPARQL Operation SELECT on repository \"default\"");
            
        }
    }

    @Test
    @SubjectAware(
            username="noPermission",
            password="noPermission",
            configuration = sparqlPermissionShiroFile
            )
    public void testNoSelectPermissionPOST() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);
            
            when(req.getParameter("query")).thenReturn(selectQuery);
            when(req.getMethod()).thenReturn(HttpMethod.POST);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            verify(res).sendError(Status.FORBIDDEN.getStatusCode(),
                    "No permission to execute SPARQL Operation SELECT on repository \"default\"");
            
        }
    }
    
    @Test
    @SubjectAware(
            username="noPermission",
            password="noPermission",
            configuration = sparqlPermissionShiroFile
            )
    public void testNoConstructPermission() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);
            
            when(req.getParameter("query")).thenReturn(constructQuery);
            when(req.getMethod()).thenReturn(HttpMethod.POST);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            verify(res).sendError(Status.FORBIDDEN.getStatusCode(), "No permission to execute SPARQL Operation CONSTRUCT on repository \"default\"");
            
        }
    }
    
    @Test
    @SubjectAware(
            username="noPermission",
            password="noPermission",
            configuration = sparqlPermissionShiroFile
            )
    public void testNoAskPermission() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);
            
            when(req.getParameter("query")).thenReturn(askQuery);
            when(req.getMethod()).thenReturn(HttpMethod.POST);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            verify(res).sendError(Status.FORBIDDEN.getStatusCode(), "No permission to execute SPARQL Operation ASK on repository \"default\"");
            
        }
    }

    @Test
    @SubjectAware(
            username="noPermission",
            password="noPermission",
            configuration = sparqlPermissionShiroFile
            )
    public void testNoUpdatePermission() throws Exception {
        Repository rep = repositoryRule.getRepository();
        try(RepositoryConnection con = rep.getConnection()){
            addTestStatements(con);
            
            when(req.getParameter("query")).thenReturn(updateOperation);
            when(req.getMethod()).thenReturn(HttpMethod.POST);
            when(req.getContentType()).thenReturn(ContentType.APPLICATION_FORM_URLENCODED.toString());
            when(req.getHeaders("Accept")).thenAnswer(TestUtils.getMimetypeAnswer(TupleQueryResultFormat.JSON.getMIMETypes()));
            when(res.getOutputStream()).thenReturn(outputStream);
            sparqlServlet.doPost(req, res);
            verify(res).sendError(Status.FORBIDDEN.getStatusCode(), "No permission to execute SPARQL Operation UPDATE on repository \"default\"");
            
        }
    }

    private void addTestStatements(RepositoryConnection con) throws Exception {
            List<Statement> stmts = Lists.newArrayList(
                    vf.createStatement(vf.createIRI("http://www.metaphacts.com/resource/Johannes"), RDF.TYPE, vf.createIRI(FOAF.NAMESPACE,"Person")),
                    vf.createStatement(vf.createIRI("http://www.metaphacts.com/resource/Artem"), RDF.TYPE, vf.createIRI(FOAF.NAMESPACE,"Person")),
                    vf.createStatement(vf.createIRI("http://www.metaphacts.com/resource/Peter"), RDF.TYPE, vf.createIRI(FOAF.NAMESPACE,"Person")),
                    vf.createStatement(vf.createIRI("http://www.metaphacts.com/resource/Michael"), RDF.TYPE, vf.createIRI(FOAF.NAMESPACE,"Person"))
                     );
           con.add(stmts, vf.createIRI(FOAF.NAMESPACE,"testContext"));
    }
    

    

}
