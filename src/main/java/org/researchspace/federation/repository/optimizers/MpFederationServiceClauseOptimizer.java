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

package org.researchspace.federation.repository.optimizers;

import java.util.Collection;
import java.util.Map;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.QueryOptimizer;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.Sail;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.federation.sparql.algebra.ServiceCallTupleExpr;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

/**
 * A {@link QueryOptimizer} determining the custom service calls in the query
 * and setting them as {@ServiceCallTupleExpr}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationServiceClauseOptimizer extends AbstractQueryModelVisitor<RepositoryException>
        implements QueryOptimizer {

    private final Collection<? extends RepositoryConnection> members;

    private final RepositoryConnection mainMember;

    private Map<IRI, ? extends Repository> serviceMappings;

    private final QueryHintsSetup queryHintsSetup;

    public MpFederationServiceClauseOptimizer(Collection<? extends RepositoryConnection> members,
            RepositoryConnection mainMember, Map<IRI, ? extends Repository> serviceMappings,
            QueryHintsSetup queryHints) {
        this.members = members;
        this.mainMember = mainMember;
        this.serviceMappings = serviceMappings;
        this.queryHintsSetup = queryHints;
    }

    @Override
    public void optimize(TupleExpr tupleExpr, Dataset dataset, BindingSet bindings) {
        tupleExpr.visit(this);
    }

    @Override
    public void meet(Service node) throws RepositoryException {
        Var serviceRefVar = node.getServiceRef();

        if (serviceRefVar.hasValue() && (serviceRefVar.getValue() instanceof IRI)) {
            IRI serviceRefUri = (IRI) serviceRefVar.getValue();

            if (serviceMappings.containsKey(serviceRefUri)) {
                Repository repo = serviceMappings.get(serviceRefUri);
                if (repo instanceof SailRepository) {
                    Sail sail = ((SailRepository) repo).getSail();
                    if (sail instanceof AbstractServiceWrappingSail) {
                        ServiceDescriptor descriptor = ((AbstractServiceWrappingSail) sail).getServiceDescriptor();
                        if (descriptor != null) {

                            ServiceCallTupleExpr serviceCallExpr = new ServiceCallTupleExpr(node, descriptor);
                            serviceCallExpr.setParentNode(node.getParentNode());
                            node.replaceWith(serviceCallExpr);
                            queryHintsSetup.replaceExprIfExists(node, serviceCallExpr);
                        }
                    }
                }

            }

        }

        super.meet(node);
    }

}