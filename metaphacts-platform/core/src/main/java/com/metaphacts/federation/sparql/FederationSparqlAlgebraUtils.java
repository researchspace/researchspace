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

package com.metaphacts.federation.sparql;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.google.common.collect.Sets;
import com.metaphacts.federation.repository.MpFederation;
import com.metaphacts.federation.sparql.algebra.ServiceCallAggregate;
import com.metaphacts.federation.sparql.algebra.ServiceCallTupleExpr;
import com.metaphacts.repository.MpRepositoryVocabulary;

/**
 * SPARQL algebra utils serving {@link MpFederation}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class FederationSparqlAlgebraUtils {

    private static class InputVarCollectorVisitor
            extends AbstractQueryModelVisitor<RepositoryException> {

        Set<Var> inputVars = Sets.newHashSet();

        @Override
        public void meet(Service node) throws RepositoryException {
            if (node instanceof ServiceCallTupleExpr) {
                inputVars.addAll(((ServiceCallTupleExpr) node).getInputVars());
            } else {
                super.meet(node);
            }
        }
    }

    private static class OutputVarCollectorVisitor
            extends AbstractQueryModelVisitor<RepositoryException> {

        Set<Var> outputVars = Sets.newHashSet();

        @Override
        public void meet(Service node) throws RepositoryException {
            if (node instanceof ServiceCallTupleExpr) {
                outputVars.addAll(((ServiceCallTupleExpr) node).getOutputVars());
            } else {
                super.meet(node);
            }
        }

    }

    private static class OwnerScanner extends AbstractQueryModelVisitor<RepositoryException> {

        private boolean shared;

        private RepositoryConnection owner;

        private Map<IRI, ? extends Repository> serviceMappings;
        private RepositoryConnection mainMember;

        private OwnerScanner(Map<IRI, ? extends Repository> serviceMappings,
                RepositoryConnection mainMember) {
            this.serviceMappings = serviceMappings;
            this.mainMember = mainMember;
        }

        /**
         * If the argument can be sent to a single member.
         */
        public RepositoryConnection getSingleOwner(TupleExpr arg) throws RepositoryException {
            boolean pre_shared = shared;
            RepositoryConnection pre_owner = owner;
            try {
                shared = false;
                owner = mainMember; // NOPMD
                arg.visit(this);
                return owner;
            } finally {
                // restore
                shared = pre_shared;
                owner = pre_owner;
            }
        }

        @Override
        public void meet(Service node) throws RepositoryException {
            if (node.getServiceRef().getValue() instanceof IRI) {
                Repository mappedRepository = serviceMappings.get(node.getServiceRef().getValue());
                if (mappedRepository != null
                        && mappedRepository.equals(mainMember.getRepository())) {
                    return;
                }
            }
            multipleOwners();

        }

        @Override
        public void meet(StatementPattern node) throws RepositoryException {
            super.meet(node);
            RepositoryConnection member = mainMember;
            usedBy(member);
        }

        @Override
        public void meetOther(QueryModelNode node) throws RepositoryException {
            if (node instanceof MpOwnedTupleExpr) {
                meetOwnedTupleExpr((MpOwnedTupleExpr) node);
            } else if (node instanceof ServiceCallAggregate) {
                multipleOwners();
            } else {
            
                super.meetOther(node);
            }
        }

        private void meetOwnedTupleExpr(MpOwnedTupleExpr node) throws RepositoryException {
            usedBy(node.getOwner());
        }

        private void usedBy(RepositoryConnection member) {
            if (!shared && owner == null) {
                // first owner sensitive element
                owner = member;
            } else if (owner != member) { // NOPMD
                multipleOwners();
            }
        }

        private void multipleOwners() {
            owner = null; // NOPMD
            shared = true;
        }

    }

    private FederationSparqlAlgebraUtils() {

    }

    /**
     * Given a {@link TupleExpr} and a list of {@link OrderElem}s, 
     * selects only those order elements, 
     * which would be used for sorting the output of the {@link TupleExpr}
     * (i.e., those which have variables in common).
     * Used when processing the top-k queries with ORDER BY to "push down" 
     * the order expression in the query tree. 
     * 
     * @param tupleExpr
     * @param orderElements
     * @return
     */
    public static List<OrderElem> getRelevantOrderElements(TupleExpr tupleExpr,
            List<OrderElem> orderElements) {
        List<OrderElem> result = new ArrayList<OrderElem>();

        VariableRetrievingVisitor variableRetrieval = new VariableRetrievingVisitor();
        List<Var> containedVariables = variableRetrieval.retrieveInvolvedVariables(tupleExpr);

        List<Var> orderElemVariables;
        for (OrderElem orderElement : orderElements) {
            orderElemVariables = variableRetrieval.retrieveInvolvedVariables(orderElement);
            orderElemVariables.retainAll(containedVariables);

            if (!orderElemVariables.isEmpty()) {
                result.add(orderElement);
            }
        }

        return result;
    }

    public static Set<Var> getInputVars(TupleExpr tupleExpr) {
        InputVarCollectorVisitor visitor = new InputVarCollectorVisitor();
        tupleExpr.visit(visitor);
        return visitor.inputVars;
    }

    public static Set<Var> getOutputVars(TupleExpr tupleExpr) {
        OutputVarCollectorVisitor visitor = new OutputVarCollectorVisitor();
        tupleExpr.visit(visitor);
        return visitor.outputVars;
    }

    /**
     * For a tuple expression, get variable names that have to be provided as inputs
     * (e.g., those declared as such in Ephedra services).
     * 
     * @param tupleExpr
     * @return
     */
    public static Set<String> getInputBindingNames(TupleExpr tupleExpr) {
        return getInputVars(tupleExpr).stream().filter(var -> !var.hasValue())
                .map(var -> var.getName()).collect(Collectors.toSet());
    }

    /**
     * For a tuple expression, get variable names that will be returned as outputs
     * (e.g., those declared as such in Ephedra services).
     * 
     * @param tupleExpr
     * @return
     */
    public static Set<String> getOutputBindingNames(TupleExpr tupleExpr) {
        OutputVarCollectorVisitor visitor = new OutputVarCollectorVisitor();
        tupleExpr.visit(visitor);
        return getOutputVars(tupleExpr).stream().filter(var -> !var.hasValue())
                .map(var -> var.getName()).collect(Collectors.toSet());
    }

    public static boolean executeOnSingleOwnerWithoutOptimization(TupleExpr tupleExpr,
            MpFederation mpFederation, RepositoryConnection defaultMemberConnection) {
        RepositoryConnection owner = FederationSparqlAlgebraUtils.getSingleOwner(tupleExpr,
                mpFederation.getServiceMappings(), defaultMemberConnection);
        if (owner != null && owner.equals(defaultMemberConnection)) {
            List<StatementPattern> queryHints = extractQueryHintsPatterns(tupleExpr);
            if (queryHints.isEmpty()) {
                return true;
            }
        }
        return false;
    }
    

    /**
     * Among the federation members, returns a single repository connection which can evaluate 
     * a given {@link TupleExpr} (if avaiable). 
     * Used to determine whether the query needs to be processed by the federation or 
     * can be sent as a whole to one endpoint.  
     * 
     * @param arg
     * @param serviceMappings
     * @param mainMember
     * @return
     * @throws RepositoryException
     */
    public static RepositoryConnection getSingleOwner(TupleExpr arg,
            Map<IRI, ? extends Repository> serviceMappings, RepositoryConnection mainMember)
            throws RepositoryException {
        return new OwnerScanner(serviceMappings, mainMember).getSingleOwner(arg);
    }

    public static boolean hasDependencies(TupleExpr arg) {
        return !getInputVars(arg).isEmpty();
    }

    public static boolean hasUnsatisfiedDependencies(TupleExpr arg, BindingSet bs) {
        List<Var> unsatisfiedInputs = getInputVars(arg).stream().filter(var -> !var.hasValue())
                .collect(Collectors.toList());
        if (bs != null) {
            unsatisfiedInputs = unsatisfiedInputs.stream()
                    .filter(var -> !bs.hasBinding(var.getName())).collect(Collectors.toList());
        }
        return !unsatisfiedInputs.isEmpty();
    }
    
    public static boolean isQueryHint(TupleExpr expr) {
        if (expr instanceof StatementPattern) {
            Var predicateVar = ((StatementPattern)expr).getPredicateVar();
            if (predicateVar.hasValue()) {
                Value val = predicateVar.getValue();
                return MpRepositoryVocabulary.queryHints.contains(val); 
            }
        }
        return false;
    }
    
    public static List<StatementPattern> extractQueryHintsPatterns(TupleExpr expr) {
        List<StatementPattern> allPatterns = StatementPatternCollector.process(expr);
        return allPatterns.stream().filter(FederationSparqlAlgebraUtils::isQueryHint).collect(Collectors.toList());
    }

}