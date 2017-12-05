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

package com.metaphacts.sail.rest;

import java.io.InputStream;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status.Family;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.BindingAssigner;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSailConnection;
import org.glassfish.jersey.client.ClientProperties;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * Abstract {@link SailConnection} implementation for REST APIs. 
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public abstract class AbstractRESTWrappingSailConnection extends AbstractSailConnection {
    
    /**
     * A class holding the mappings for the API inputs (parameter name->value as string) 
     * and outputs (IRI->variable name)
     * 
     * @author Andriy Nikolov an@metaphacts.com
     *
     */
    protected static class RESTParametersHolder {
        private String subjVarName = null;
        private Map<String, String> inputParameters = Maps.newHashMap();
        private Map<IRI, String> outputVariables = Maps.newHashMap();
        
        public RESTParametersHolder() {
            
        }
        
        public String getSubjVarName() {
            return subjVarName;
        }
        public void setSubjVarName(String subjVarName) {
            this.subjVarName = subjVarName;
        }
        public Map<String, String> getInputParameters() {
            return inputParameters;
        }
        public Map<IRI, String> getOutputVariables() {
            return outputVariables;
        }
    }
    
    private final AbstractRESTWrappingSail sail;

    public AbstractRESTWrappingSailConnection(AbstractRESTWrappingSail sailBase) {
        super(sailBase);
        this.sail = sailBase;
    }

    @Override
    protected void closeInternal() throws SailException {
    }

    /**
     * Follows the following workflow:
     * <ul>
     *  <li>Extract input/output parameters and store them in a {@link RESTParametersHolder} object.</li>
     *  <li>Submit an HTTP request (by default, an HTTP GET request passing parameters via URL)</li>
     *  <li>Process the response and assign the outputs to the output variables.</li>
     * </ul>
     * 
     */
    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> evaluateInternal(
            TupleExpr tupleExpr, Dataset dataset, BindingSet bindings, boolean includeInferred)
            throws SailException {
        TupleExpr cloned = tupleExpr.clone();
        new BindingAssigner().optimize(cloned, dataset, bindings);
        StatementPatternCollector collector = new StatementPatternCollector();
        cloned.visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();
        RESTParametersHolder parametersHolder = extractInputsAndOutputs(stmtPatterns);
        Response response = submit(parametersHolder);
        if (!response.getStatusInfo().getFamily().equals(Family.SUCCESSFUL)) {
            throw new SailException(
                    "Request failed with HTTP status code " 
                            + response.getStatus()
                            + ": " 
                            + response.getStatusInfo().getReasonPhrase());
        }
        InputStream resultStream;
        
        resultStream = (InputStream)response.getEntity();
        
        
        return new CollectionIteration<BindingSet, QueryEvaluationException>(
                convertStream2BindingSets(resultStream, parametersHolder));
    }

    @Override
    protected CloseableIteration<? extends Resource, SailException> getContextIDsInternal()
            throws SailException {
        return new CollectionIteration<Resource, SailException>(
                Lists.<Resource>newArrayList());
    }

    @Override
    protected CloseableIteration<? extends Statement, SailException> getStatementsInternal(
            Resource subj, IRI pred, Value obj, boolean includeInferred, Resource... contexts)
            throws SailException {
        return new CollectionIteration<Statement, SailException>(
                Lists.<Statement>newArrayList());
    }

    @Override
    protected long sizeInternal(Resource... contexts) throws SailException {
        return 0;
    }

    @Override
    protected void startTransactionInternal() throws SailException {

    }

    @Override
    protected void commitInternal() throws SailException {
        
    }

    @Override
    protected void rollbackInternal() throws SailException {
        
    }

    @Override
    protected void addStatementInternal(Resource subj, IRI pred, Value obj, Resource... contexts)
            throws SailException {
        throw new SailException("The REST API " + this.sail.getUrl().toString() + " is read-only");
    }

    @Override
    protected void removeStatementsInternal(Resource subj, IRI pred, Value obj,
            Resource... contexts) throws SailException {
        throw new SailException("The REST API " + this.sail.getUrl().toString() + " is read-only");
    }

    @Override
    protected void clearInternal(Resource... contexts) throws SailException {
        throw new SailException("The REST API " + this.sail.getUrl().toString() + " is read-only");

    }

    @Override
    protected CloseableIteration<? extends Namespace, SailException> getNamespacesInternal()
            throws SailException {
        return new CollectionIteration<Namespace, SailException>(
                Lists.<Namespace>newArrayList());
    }

    @Override
    protected String getNamespaceInternal(String prefix) throws SailException {
        return null;
    }

    @Override
    protected void setNamespaceInternal(String prefix, String name) throws SailException {

    }

    @Override
    protected void removeNamespaceInternal(String prefix) throws SailException {

    }

    @Override
    protected void clearNamespacesInternal() throws SailException {

    }
    
    public AbstractRESTWrappingSail getSail() {
        return sail;
    }
    
    /**
     * Default implementation calling the API using an HTTP GET method.
     * Parameters are passed via URL.
     * JSON expected as a result format.
     * 
     * @param parametersHolder
     * @return
     */
    protected Response submit(RESTParametersHolder parametersHolder) {
        try {
            Client client = ClientBuilder.newClient();
            WebTarget targetResource = client
                    .target(getSail().getUrl())
                    .property(ClientProperties.FOLLOW_REDIRECTS, Boolean.TRUE);
            for(Entry<String, String> entry : parametersHolder.inputParameters.entrySet()) {
                targetResource = targetResource.queryParam(entry.getKey(), entry.getValue());
            }
            return targetResource.request(MediaType.TEXT_PLAIN).get();
        } catch(Exception e) {
            throw new SailException(e);
        }
    }
    
    protected abstract RESTParametersHolder extractInputsAndOutputs(
            List<StatementPattern> stmtPatterns) throws SailException;
    
    protected abstract Collection<BindingSet> convertStream2BindingSets(InputStream inputStream, 
            RESTParametersHolder parametersHolder) throws SailException;
}