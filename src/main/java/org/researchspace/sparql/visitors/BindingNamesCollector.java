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

package org.researchspace.sparql.visitors;

import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.Extension;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;

import java.util.HashSet;
import java.util.Set;

/**
 * Collects all free non-anonymous variable names referenced in an expression.
 */
public class BindingNamesCollector extends AbstractQueryModelVisitor<RuntimeException> {
    private final Set<String> bindingNames = new HashSet<>();

    public Set<String> getBindingNames() {
        return bindingNames;
    }

    @Override
    public void meet(BindingSetAssignment node) throws RuntimeException {
        super.meet(node);
        bindingNames.addAll(node.getBindingNames());
    }

    @Override
    public void meet(Var node) throws RuntimeException {
        super.meet(node);
        if (!node.isAnonymous() && !node.hasValue()) {
            bindingNames.add(node.getName());
        }
    }

    @Override
    public void meet(Extension node) throws RuntimeException {
        super.meet(node);
        bindingNames.addAll(node.getBindingNames());
    }
}
