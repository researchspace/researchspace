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

package org.researchspace.federation.repository.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.util.RDFCollections;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.eclipse.rdf4j.model.vocabulary.SPIN;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.TupleExprs;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.vocabulary.SPL;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import javax.annotation.Nullable;

/**
 * Descriptor for custom services.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ServiceDescriptor {

    public enum Cardinality {
        ONE, MANY
    }

    public static class Parameter {

        private String parameterName;
        private String jsonPath;
        private String inputJsonPath;
        private Resource parameterId;
        private Resource rootNode;
        private IRI valueType;
        private Map<IRI, Value> propertiesMap = Maps.newHashMap();
        private Value defaultValue = null;

        private List<StatementPattern> subjectPatterns = Lists.newArrayList();
        private List<StatementPattern> objectPatterns = Lists.newArrayList();
        private List<StatementPattern> predicatePatterns = Lists.newArrayList();

        public Resource getParameterId() {
            return parameterId;
        }

        public String getInputJsonPath() {
            return inputJsonPath;
        }

        public void setInputJsonPath(String inputJsonPath) {
            this.inputJsonPath = inputJsonPath;
        }

        public String getJsonPath() {
            return jsonPath;
        }

        public void setJsonPath(String jsonPath) {
            this.jsonPath = jsonPath;
        }

        public String getParameterName() {
            return parameterName;
        }

        public List<StatementPattern> getSubjectPatterns() {
            return subjectPatterns;
        }

        public List<StatementPattern> getObjectPatterns() {
            return objectPatterns;
        }

        public IRI getValueType() {
            return valueType;
        }

        public Resource getRootNode() {
            return rootNode;
        }

        public Map<IRI, Value> getPropertiesMap() {
            return propertiesMap;
        }

        public Optional<Value> getDefaultValue() {
            return Optional.ofNullable(defaultValue);
        }

        public void setDefaultValue(Value defaultValue) {
            this.defaultValue = defaultValue;
        }

    }

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    /** The name of the Turtle file (without the .ttl extension) */
    private final String serviceId;

    private Cardinality inputCardinality;
    private Cardinality outputCardinality;
    private IRI serviceIRI;
    private String label = null;

    private List<StatementPattern> statementPatterns = Lists.newArrayList();

    private Map<String, Parameter> inputParameters = Maps.newHashMap();
    private Map<String, Parameter> outputParameters = Maps.newHashMap();

    private Model model;

    public ServiceDescriptor() {
        this(null);
    }

    public ServiceDescriptor(@Nullable String serviceId) {
        this.serviceId = serviceId;
    }

    public String getServiceId() {
        return serviceId;
    }

    public void parse(Model model, IRI serviceIRI) {
        this.model = model;
        Map<Resource, Parameter> parametersByIRI = Maps.newHashMap();

        this.serviceIRI = serviceIRI;

        Optional<Literal> optLabel = Models.getPropertyLiteral(model, serviceIRI, RDFS.LABEL);
        if (optLabel.isPresent()) {
            this.label = optLabel.get().stringValue();
        }

        Set<Resource> inputs = Models.objectResources(model.filter(serviceIRI, SPIN.CONSTRAINT_PROPERTY, null));
        inputs.stream().filter(input -> model.contains(input, RDF.TYPE, SPL.ARGUMENT_CLASS))
                .map(input -> parseParameter(model, input)).forEach(param -> {
                    inputParameters.put(param.getParameterName(), param);
                    parametersByIRI.put(param.getParameterId(), param);
                });

        Set<Resource> outputs = Models.objectResources(model.filter(serviceIRI, SPIN.COLUMN_PROPERTY, null));
        outputs.stream().filter(output -> model.contains(output, RDF.TYPE, SPIN.COLUMN_CLASS))
                .map(input -> parseParameter(model, input)).forEach(param -> {
                    outputParameters.put(param.getParameterName(), param);
                    parametersByIRI.put(param.getParameterId(), param);
                });

        Resource sparqlPattern = Models
                .objectResource(model.filter(serviceIRI, MpRepositoryVocabulary.HAS_SPARQL_PATTERN, null)).get();

        List<Value> items = RDFCollections.asValues(model, sparqlPattern, Lists.newArrayList());

        items.stream().map(item -> (Resource) item).map(item -> parseStatementPattern(item, model, parametersByIRI))
                .forEach(stmtPattern -> statementPatterns.add(stmtPattern));
    }

    protected Parameter parseParameter(Model model, Resource resource) {
        Parameter parameter = new Parameter();
        Optional<Resource> varOptional = Models.objectResource(model.filter(resource, SPL.PREDICATE_PROPERTY, null));
        parameter.rootNode = resource;
        parameter.parameterId = varOptional.get();
        if (parameter.parameterId instanceof BNode) {
            parameter.parameterName = ((BNode) parameter.parameterId).getID();
        } else if ((parameter.parameterId instanceof IRI)) {
            String id = ((IRI) parameter.parameterId).getLocalName();
            if (!id.startsWith("_")) {
                throw new IllegalArgumentException(
                        "parameterId can be reprepresented by a blank node or a URI starting with '_'");
            }
            parameter.parameterName = id.substring(1);
        }

        Optional<IRI> typeOptional = Models.objectIRI(model.filter(resource, SPL.VALUETYPE_PROPERTY, null));
        if (typeOptional.isPresent()) {
            parameter.valueType = typeOptional.get();
        }

        // @gspinaci Parse jsonPath from descriptor
        Optional<Literal> jsonPathOptional = Models
                .objectLiteral(model.filter(resource, MpRepositoryVocabulary.JSON_PATH, null));
        if (jsonPathOptional.isPresent()) {
            parameter.jsonPath = jsonPathOptional.get().stringValue();
        }

        // @gspinaci Parse inputJsonPath from descriptor
        Optional<Literal> inputJsonPathOptional = Models
                .objectLiteral(model.filter(resource, MpRepositoryVocabulary.INPUT_JSON_PATH, null));
        if (inputJsonPathOptional.isPresent()) {
            parameter.inputJsonPath = inputJsonPathOptional.get().stringValue();
        }

        for (Statement stmt : model.filter(resource, null, null)) {
            parameter.propertiesMap.put(stmt.getPredicate(), stmt.getObject());
        }

        Optional<Value> defaultValue = Models.object(model.filter(resource, SPL.DEFAULT_VALUE_PROPERTY, null));
        if (defaultValue.isPresent()) {
            parameter.setDefaultValue(defaultValue.get());
        }

        return parameter;
    }

    protected StatementPattern parseStatementPattern(Resource resource, Model model,
            Map<Resource, Parameter> paramMap) {
        StatementPattern pattern = new StatementPattern();

        Value subj = Models.object(model.filter(resource, SP.SUBJECT_PROPERTY, null)).get();
        Value predicate = Models.object(model.filter(resource, SP.PREDICATE_PROPERTY, null)).get();
        Value obj = Models.object(model.filter(resource, SP.OBJECT_PROPERTY, null)).get();

        pattern.setSubjectVar(parseToVar(subj));
        pattern.setPredicateVar(parseToVar(predicate));
        pattern.setObjectVar(parseToVar(obj));

        if ((subj instanceof Resource) && paramMap.containsKey(subj)) {
            paramMap.get(subj).subjectPatterns.add(pattern);
        }
        if ((obj instanceof Resource) && paramMap.containsKey(obj)) {
            paramMap.get(obj).objectPatterns.add(pattern);
        }

        return pattern;
    }

    protected Var parseToVar(Value res) {
        String id = null;
        if (res instanceof BNode) {
            return new Var(((BNode) res).getID());
        } else if (res instanceof IRI) {
            id = ((IRI) res).getLocalName();
            if (id.startsWith("_")) {
                id = id.substring(1);
                return new Var(id);
            }
        }
        return TupleExprs.createConstVar(res);
    }

    public IRI getServiceIRI() {
        return serviceIRI;
    }

    public String getLabel() {
        return label;
    }

    public List<StatementPattern> getStatementPatterns() {
        return statementPatterns;
    }

    public void setStatementPatterns(List<StatementPattern> statementPatterns) {
        this.statementPatterns = statementPatterns;
    }

    public Map<String, Parameter> getInputParameters() {
        return this.inputParameters;
    }

    public Map<String, Parameter> getOutputParameters() {
        return this.outputParameters;
    }

    public Model getModel() {
        return model;
    }
}
