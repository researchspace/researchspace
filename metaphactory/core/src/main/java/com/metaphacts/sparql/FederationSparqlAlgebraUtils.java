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

package com.metaphacts.sparql;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.metaphacts.repository.federation.MpFederation;

/**
 * SPARQL algebra utils serving {@link MpFederation}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class FederationSparqlAlgebraUtils {

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

}