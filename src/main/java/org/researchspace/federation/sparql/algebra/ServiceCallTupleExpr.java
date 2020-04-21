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

package org.researchspace.federation.sparql.algebra;

import java.util.Map;
import java.util.Set;

import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.federation.repository.service.SparqlServiceUtils;

import com.google.common.collect.Sets;

/**
 * A {@link TupleExpr} for custom services.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ServiceCallTupleExpr extends Service {

    private static final long serialVersionUID = 7713913969861730777L;

    private final ServiceDescriptor descriptor;
    private final Service wrappedService;

    public ServiceCallTupleExpr(Service wrapped, ServiceDescriptor serviceDescriptor) {
        super(wrapped.getServiceRef(), wrapped.getServiceExpr(), wrapped.getServiceExpressionString(),
                wrapped.getPrefixDeclarations(), wrapped.getBaseURI(), wrapped.isSilent());

        this.descriptor = serviceDescriptor;
        this.wrappedService = wrapped;
    }

    @Override
    public Set<String> getServiceVars() {
        return wrappedService.getServiceVars();
    }

    public Set<Var> getInputVars() {
        Set<Var> res = Sets.newHashSet();
        if (descriptor != null) {
            Map<String, Var> map = SparqlServiceUtils.extractInputParameters(this.getServiceExpr(), descriptor);
            res.addAll(map.values());
        }
        return res;
    }

    public Set<Var> getOutputVars() {
        Set<Var> res = Sets.newHashSet();
        if (descriptor != null) {
            Map<String, Var> map = SparqlServiceUtils.extractOutputParameters(this.getServiceExpr(), descriptor);
            res.addAll(map.values());
        }
        return res;

    }

    public ServiceDescriptor.Cardinality getOutputCardinality() {
        return ServiceDescriptor.Cardinality.MANY;

    }

    public ServiceDescriptor getDescriptor() {
        return descriptor;
    }
}