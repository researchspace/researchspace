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

package com.metaphacts.federation.repository.service;

import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;

import com.google.common.collect.Maps;

public class SparqlServiceUtils {

    private SparqlServiceUtils() {

    }

    public static Map<String, Var> extractInputParameters(TupleExpr tupleExpr,
            ServiceDescriptor descriptor) {
        return extractParameters(tupleExpr, descriptor.getInputParameters());
    }

    public static Map<String, Var> extractOutputParameters(TupleExpr tupleExpr,
            ServiceDescriptor descriptor) {
        return extractParameters(tupleExpr, descriptor.getOutputParameters());
    }

    public static Map<String, Var> extractParameters(TupleExpr tupleExpr,
            Map<String, ServiceDescriptor.Parameter> parameters) {
        StatementPatternCollector collector = new StatementPatternCollector();
        tupleExpr.visit(collector);
        List<StatementPattern> actualPatterns = collector.getStatementPatterns();

        Map<String, Var> res = Maps.newHashMap();

        for (ServiceDescriptor.Parameter param : parameters.values()) {
            Var matchedVar = retrieveVarForParameter(param, actualPatterns);
            if (matchedVar != null) {
                res.put(param.getParameterName(), matchedVar);
            }
        }
        return res;
    }

    private static Var retrieveVarForParameter(ServiceDescriptor.Parameter param,
            List<StatementPattern> patterns) {

        Var matchedVar = null;

        for (StatementPattern subjectPattern : param.getSubjectPatterns()) {
            for (StatementPattern inputPattern : patterns) {
                if (matches(inputPattern, subjectPattern)) {
                    if ((matchedVar != null) && !matchedVar.equals(inputPattern.getSubjectVar())) {
                        throw new IllegalStateException("The parameter " + param.getParameterName()
                                + " has more than one binding");
                    } else {
                        matchedVar = inputPattern.getSubjectVar();
                    }
                }
            }
        }
        for (StatementPattern objectPattern : param.getObjectPatterns()) {
            for (StatementPattern inputPattern : patterns) {
                if (matches(inputPattern, objectPattern)) {
                    if ((matchedVar != null) && !matchedVar.equals(inputPattern.getObjectVar())) {
                        throw new IllegalStateException("The parameter " + param.getParameterName()
                                + " has more than one binding");
                    } else {
                        matchedVar = inputPattern.getObjectVar();
                    }
                }
            }
        }

        return matchedVar;
    }

    private static boolean matches(StatementPattern input, StatementPattern template) {
        return (matches(input.getSubjectVar(), template.getSubjectVar())
                && matches(input.getPredicateVar(), template.getPredicateVar())
                && matches(input.getObjectVar(), template.getObjectVar()));
    }

    private static boolean matches(Var input, Var template) {
        if (template.hasValue()) {
            if (input.hasValue() && !input.getValue().equals(template.getValue())) {
                return false;
            }
        }
        return true;
    }

}