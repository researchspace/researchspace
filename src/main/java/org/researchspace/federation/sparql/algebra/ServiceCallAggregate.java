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

import org.eclipse.rdf4j.query.algebra.AbstractAggregateOperator;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.ValueExpr;

public class ServiceCallAggregate extends AbstractAggregateOperator {

    private static final long serialVersionUID = 1L;
    private String serviceUri;

    public ServiceCallAggregate(String serviceUri, ValueExpr arg) {
        super(arg);
        this.serviceUri = serviceUri;
    }

    public String getServiceUri() {
        return serviceUri;
    }

    @Override
    public <X extends Exception> void visit(QueryModelVisitor<X> visitor) throws X {
        visitor.meetOther(this);
    }

    @Override
    public boolean equals(Object other) {
        if (other instanceof ServiceCallAggregate && super.equals(other)) {
            return serviceUri.equals(((ServiceCallAggregate) other).serviceUri);
        }
        return false;
    }

    @Override
    public int hashCode() {
        return super.hashCode() ^ serviceUri.hashCode();
    }

    @Override
    public ServiceCallAggregate clone() {
        return (ServiceCallAggregate) super.clone();
    }
}
