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

package org.researchspace.sail.rest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSail;
import org.researchspace.federation.repository.MpSparqlServiceRegistry;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsHelper;

import com.google.common.collect.Maps;
/**
 * Abstract {@link Sail} implementation for invokable services that are defined by a URL.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
import com.google.inject.Inject;
import com.google.inject.Provider;

public abstract class AbstractServiceWrappingSail<C extends AbstractServiceWrappingSailConfig> extends AbstractSail {

    private C config;
    private ServiceDescriptor serviceDescriptor = null;

    @Inject
    protected Provider<MpSparqlServiceRegistry> serviceRegistryProvider;

    @Inject
    private Provider<SecretResolver> secretResolver;

    protected Map<IRI, Parameter> mapOutputParametersByProperty = null;
    protected Map<IRI, Parameter> mapInputParametersByProperty = null;
    protected Optional<Parameter> subjectParameter = null;

    public AbstractServiceWrappingSail(C config) {
        this.config = config;

    }

    @Override
    protected void initializeInternal() throws SailException {
        this.resolveSecrets(config);
        this.initParameters();
    }

    private void resolveSecrets(C config) {
        if (config.getUnResolvedUsername() != null && config.getUnResolvedPassword() != null) {
            String username = SecretsHelper.resolveSecretOrFallback(secretResolver.get(),
                    config.getUnResolvedUsername());
            config.setUsername(username);
            String password = SecretsHelper.resolveSecretOrFallback(secretResolver.get(),
                    config.getUnResolvedPassword());
            config.setPassword(password);
        }
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

    public ServiceDescriptor getServiceDescriptor() {
        if ((serviceDescriptor == null) && (this.config.getServiceID() != null) && (serviceRegistryProvider != null)) {
            MpSparqlServiceRegistry registry = serviceRegistryProvider.get();
            if (registry != null) {
                registry.getDescriptorForIri(this.config.getServiceID()).ifPresent(descriptor -> {
                    this.serviceDescriptor = descriptor;
                });
            }
        }
        return serviceDescriptor;
    }

    public void setServiceDescriptor(ServiceDescriptor serviceDescriptor) {
        this.serviceDescriptor = serviceDescriptor;
    }

    protected void initParameters() {
        this.mapOutputParametersByProperty = Maps.newHashMap();
        this.mapInputParametersByProperty = Maps.newHashMap();

        ServiceDescriptor descriptor = this.getServiceDescriptor();

        if (descriptor == null) {
            throw new IllegalStateException("Service descriptor is not configured or does not exist. Hint: does "
                    + this.config.getServiceID() + " point to an existing service descriptor?");
        }

        // Collect definitions of input parameters from the service descriptor
        readParametersFromConfig(descriptor, descriptor.getInputParameters(), mapInputParametersByProperty);
        // Collect definitions of output parameters from the service descriptor
        readParametersFromConfig(descriptor, descriptor.getOutputParameters(), mapOutputParametersByProperty);

        subjectParameter = readSubjectParameter(descriptor);
    }

    protected void readParametersFromConfig(ServiceDescriptor descriptor, Map<String, Parameter> parametersById,
            Map<IRI, Parameter> parametersByPropertyIri) {
        List<StatementPattern> statementPatterns = descriptor.getStatementPatterns();

        parametersById.entrySet().stream().forEach(entry -> {
            Parameter param = entry.getValue();

            parametersById.put(param.getParameterName(), param);

            Optional<IRI> propertyIri = getPropertyIRI4Parameter(param.getParameterName(), statementPatterns);
            if (propertyIri.isPresent()) {
                parametersByPropertyIri.put(propertyIri.get(), param);
            }
        });
    }

    protected Optional<Parameter> readSubjectParameter(ServiceDescriptor descriptor) {
        Map<String, Parameter> outputParameters = descriptor.getOutputParameters();

        return outputParameters.entrySet().stream().map(entry -> entry.getValue())
                .filter(param -> (!param.getSubjectPatterns().isEmpty() && param.getObjectPatterns().isEmpty()))
                .findFirst();

    }

    protected Optional<IRI> getPropertyIRI4Parameter(String parameterName, List<StatementPattern> statementPatterns) {
        return statementPatterns.stream()
                .filter(stmtPattern -> !stmtPattern.getObjectVar().hasValue()
                        && stmtPattern.getObjectVar().getName().equals(parameterName)
                        && stmtPattern.getPredicateVar().hasValue())
                .map(stmtPattern -> stmtPattern.getPredicateVar().getValue()).map(pred -> (IRI) pred).findFirst();
    }

    public C getConfig() {
        return config;
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
