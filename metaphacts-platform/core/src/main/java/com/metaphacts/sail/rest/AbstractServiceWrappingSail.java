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

package com.metaphacts.sail.rest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSail;

import com.google.common.collect.Maps;
/**
 * Abstract {@link Sail} implementation for invokable services that are defined by a URL.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.federation.repository.MpSparqlServiceRegistry;
import com.metaphacts.federation.repository.service.ServiceDescriptor;
import com.metaphacts.federation.repository.service.ServiceDescriptor.Parameter;

public abstract class AbstractServiceWrappingSail extends AbstractSail {

    private final String url;
    private IRI serviceID;
    private ServiceDescriptor serviceDescriptor = null;

    @Inject
    protected Provider<MpSparqlServiceRegistry> serviceRegistryProvider;
    protected Map<IRI, Parameter> mapOutputParametersByProperty = null;
    protected Map<IRI, Parameter> mapInputParametersByProperty = null;
    protected Optional<Parameter> subjectParameter = null;

    public AbstractServiceWrappingSail(String url) {
        this.url = url;
    }

    @Override
    public boolean isWritable() throws SailException {
        return false;
    }

    @Override
    public ValueFactory getValueFactory() {
        return SimpleValueFactory.getInstance();
    }

    @Override
    protected void shutDownInternal() throws SailException {

    }

    public String getUrl() {
        return url;
    }

    public ServiceDescriptor getServiceDescriptor() {
        if ((serviceDescriptor == null) && (serviceID != null) && (serviceRegistryProvider != null)) {
            MpSparqlServiceRegistry registry = serviceRegistryProvider.get();
            if (registry != null) {
                registry.getDescriptorForIri(serviceID).ifPresent(descriptor -> {
                    this.serviceDescriptor = descriptor;
                });
            }
        }
        return serviceDescriptor;
    }

    public void setServiceDescriptor(ServiceDescriptor serviceDescriptor) {
        this.serviceDescriptor = serviceDescriptor;
    }

    public IRI getServiceID() {
        return serviceID;
    }

    public void setServiceID(IRI serviceID) {
        this.serviceID = serviceID;
    }

    protected void initParameters() {
        this.mapOutputParametersByProperty = Maps.newHashMap();
        this.mapInputParametersByProperty = Maps.newHashMap();
    
        ServiceDescriptor descriptor = this.getServiceDescriptor();

        if (descriptor == null) {
            throw new IllegalStateException("Service descriptor is not configured or does not exist. Hint: does "
                    + this.serviceID + " point to an existing service descriptor?");
        }
    
        // Collect definitions of input parameters from the service descriptor
        readParametersFromConfig(descriptor, descriptor.getInputParameters(),
                mapInputParametersByProperty);
        // Collect definitions of output parameters from the service descriptor
        readParametersFromConfig(descriptor, descriptor.getOutputParameters(),
                mapOutputParametersByProperty);
    
        subjectParameter = readSubjectParameter(descriptor);
    }

    protected void readParametersFromConfig(ServiceDescriptor descriptor, Map<String, Parameter> parametersById, Map<IRI, Parameter> parametersByPropertyIri) {
        List<StatementPattern> statementPatterns = descriptor.getStatementPatterns();
    
        parametersById.entrySet().stream().forEach(entry -> {
            Parameter param = entry.getValue();
    
            parametersById.put(param.getParameterName(), param);
    
            Optional<IRI> propertyIri = getPropertyIRI4Parameter(param.getParameterName(),
                    statementPatterns);
            if (propertyIri.isPresent()) {
                parametersByPropertyIri.put(propertyIri.get(), param);
            }
        });
    }

    protected Optional<Parameter> readSubjectParameter(ServiceDescriptor descriptor) {
        Map<String, Parameter> outputParameters = descriptor.getOutputParameters();
    
        return outputParameters.entrySet().stream().map(entry -> entry.getValue())
                .filter(param -> (!param.getSubjectPatterns().isEmpty()
                        && param.getObjectPatterns().isEmpty()))
                .findFirst();
    
    }

    protected Optional<IRI> getPropertyIRI4Parameter(String parameterName, List<StatementPattern> statementPatterns) {
        return statementPatterns.stream()
                .filter(stmtPattern -> !stmtPattern.getObjectVar().hasValue()
                        && stmtPattern.getObjectVar().getName().equals(parameterName)
                        && stmtPattern.getPredicateVar().hasValue())
                .map(stmtPattern -> stmtPattern.getPredicateVar().getValue())
                .map(pred -> (IRI) pred).findFirst();
    }

    public Map<IRI, Parameter> getMapOutputParametersByProperty() {
        return mapOutputParametersByProperty;
    }

    public Map<IRI, Parameter> getMapInputParametersByProperty() {
        return mapInputParametersByProperty;
    }

    public Optional<Parameter> getSubjectParameter() {
        return subjectParameter;
    }
}
