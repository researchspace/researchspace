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

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.MapBindingSet;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import com.metaphacts.sail.rest.AbstractServiceWrappingSailConnection.RESTParametersHolder;

/**
 * Util class for common {@link AbstractServiceWrappingSailConnection} routines, 
 * in particular, for extracting input and output parameters from the 
 * SPARQL {@link StatementPattern}s passed to the service.
 *  
 * @author Andriy Nikolov an@metaphacts.com
 */
public class RESTWrappingSailUtils {
    
    private static final ValueFactory VF = SimpleValueFactory.getInstance();
    
    private RESTWrappingSailUtils() {

    }
    
    /**
     * Collects constants (either literals or resources) which appear as objects 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static List<Value> getObjectInputParameters(Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        return statementPatterns.stream().filter(stmtPattern -> (predicateAndSubjectVarMatch(stmtPattern, subjectVariable, propertyIri) 
                && stmtPattern.getObjectVar().hasValue())).map(stmtPattern -> stmtPattern.getObjectVar().getValue()).collect(Collectors.toList());
    }
    
    /**
     * Collects {@Literal} constants which appear as objects 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static List<Literal> getLiteralObjectInputParameters(
            Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        return getObjectInputParameters(statementPatterns, subjectVariable, propertyIri).stream()
                .filter(val -> (val instanceof Literal)).map(val -> (Literal) val)
                .collect(Collectors.toList());
    }
    
    /**
     * Collects {Resource} constants which appear as objects 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static List<Resource> getResourceObjectInputParameters(
            Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        return getObjectInputParameters(statementPatterns, subjectVariable, propertyIri).stream()
                .filter(val -> (val instanceof Resource)).map(val -> (Resource) val)
                .collect(Collectors.toList());
    }
    
    
    /**
     * Retrieves a single constant (either literal or resource) which appears as an object 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static Optional<Value> getObjectInputParameter(Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        List<Value> objValues = getObjectInputParameters(statementPatterns, subjectVariable, propertyIri);
        return objValues.isEmpty() ? Optional.empty() : Optional.of(objValues.iterator().next());
    }
    
    /**
     * Retrieves a single {@Literal} constant which appears as an object 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static Optional<Literal> getLiteralObjectInputParameter(
            Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        List<Literal> objLiterals = getLiteralObjectInputParameters(statementPatterns, subjectVariable, propertyIri);
        return objLiterals.isEmpty() ? Optional.empty() : Optional.of(objLiterals.iterator().next());
    }
    
    /**
     * Retrieves a single {@Resource} constant which appears as an object 
     * of <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static Optional<Resource> getResourceObjectInputParameter(
            Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        List<Resource> objResources = getResourceObjectInputParameters(statementPatterns, subjectVariable, propertyIri);
        return objResources.isEmpty() ? Optional.empty() : Optional.of(objResources.iterator().next());
    }
    
    /**
     * Retrieves a variable appearing as object of 
     * <code>propertyIri</code> and (optional) <code>subjectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static Optional<Var> getObjectOutputVariable(
            Collection<StatementPattern> statementPatterns,
            Var subjectVariable,
            IRI propertyIri) {
        return statementPatterns.stream().filter(stmtPattern -> 
            (predicateEquals(stmtPattern, propertyIri)
                && ((subjectVariable == null) || subjectEquals(stmtPattern, subjectVariable))
                && isVariable(stmtPattern.getObjectVar()))
            ).map(stmtPattern -> stmtPattern.getObjectVar()).findFirst();
    }
    
    /**
     * Retrieves a variable appearing as subject of 
     * <code>propertyIri</code> and (optional) <code>objectVariable</code>. 
     * 
     * @param statementPatterns
     * @param subjectVariable
     * @param propertyIri
     * @return
     */
    public static Optional<Var> getSubjectOutputVariable(
            Collection<StatementPattern> statementPatterns,
            Var objectVariable,
            IRI propertyIri) {
        return statementPatterns.stream().filter(stmtPattern -> 
            (predicateEquals(stmtPattern, propertyIri)
                && ((objectVariable == null) || objectEquals(stmtPattern, objectVariable))
                && isVariable(stmtPattern.getSubjectVar()))
            ).map(stmtPattern -> stmtPattern.getSubjectVar()).findFirst();
    }
    
    public static void addBindingIfExists(RESTParametersHolder parametersHolder,
            Map<String, Object> resMap, MapBindingSet bs, String key, IRI propertyIri,
            IRI dataType) {
        if (parametersHolder.getOutputVariables().containsKey(propertyIri)) {
            Object objVal = resMap.get(key);
            String variableName = parametersHolder.getOutputVariables().get(propertyIri);
            addToBindingSet(bs, variableName, objVal, dataType);
        }
    }
    
    public static void addBindingFromJsonPathIfExists(RESTParametersHolder parametersHolder,
            Object resMap, MapBindingSet bs, String key, IRI propertyIri, IRI dataType,
            String jsonPath) {
        if (parametersHolder.getOutputVariables().containsKey(propertyIri)) {
            try {
                Object objVal = JsonPath.read(resMap, jsonPath);
                String variableName = parametersHolder.getOutputVariables().get(propertyIri);
                addToBindingSet(bs, variableName, objVal, dataType);
            } catch (PathNotFoundException e) {
                // legit situation: the path not present, we just skip the variable
            }
        }
    }
    
    private static void addToBindingSet(MapBindingSet bs, String variableName, Object objVal,
            IRI dataType) {
        Value rdfValue;
        if (dataType.equals(XMLSchema.ANYURI)) {
            rdfValue = VF.createIRI(objVal.toString());
        } else {
            rdfValue = VF.createLiteral(objVal.toString(), dataType);
        }
        bs.addBinding(variableName, rdfValue);
    }
    
    private static boolean predicateEquals(StatementPattern pattern, IRI propertyIri) {
        return pattern.getPredicateVar().hasValue() && pattern.getPredicateVar().getValue().equals(propertyIri);
    }
    
    private static boolean subjectEquals(StatementPattern pattern, Resource resource) {
        return pattern.getSubjectVar().hasValue() && pattern.getSubjectVar().getValue().equals(resource);
    }
    
    private static boolean subjectEquals(StatementPattern pattern, String varName) {
        return (!pattern.getSubjectVar().hasValue()) && pattern.getSubjectVar().getName().equals(varName);
    }
    
    private static boolean subjectEquals(StatementPattern pattern, Var subjectVar) {
        return subjectVar.hasValue() ? subjectEquals(pattern, (Resource)subjectVar.getValue()) : subjectEquals(pattern, subjectVar.getName());
    }
    
    private static boolean objectEquals(StatementPattern pattern, Value resource) {
        return pattern.getObjectVar().hasValue() && pattern.getObjectVar().getValue().equals(resource);
    }
    
    private static boolean objectEquals(StatementPattern pattern, String varName) {
        return (!pattern.getObjectVar().hasValue()) && pattern.getObjectVar().getName().equals(varName);
    }
    
    private static boolean objectEquals(StatementPattern pattern, Var objectVar) {
        return objectVar.hasValue() ? objectEquals(pattern, objectVar.getValue()) : objectEquals(pattern, objectVar.getName());
    }
    
    private static boolean predicateAndSubjectVarMatch(StatementPattern stmtPattern, Var subjectVariable, IRI propertyIri) {
        return predicateEquals(stmtPattern, propertyIri)
                && ((subjectVariable == null) || subjectEquals(stmtPattern, subjectVariable));
    }
    
    private static boolean isLiteralConstant(Var var) {
        return var.hasValue() && (var.getValue() instanceof Literal);
    }
    
    private static boolean isResourceConstant(Var var) {
        return var.hasValue() && (var.getValue() instanceof Resource);
    }
    
    private static boolean isVariable(Var var) {
        return !var.hasValue();
    }

}
