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

import org.eclipse.rdf4j.query.Binding;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.query.impl.SimpleBinding;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Renames ?(fromVariableName) variables to ?(toVariableName)
 */
public class VarRenameVisitor extends AbstractQueryModelVisitor<RuntimeException> {
    private final String fromVariableName;
    private final String toVariableName;

    public VarRenameVisitor(String fromVariableName, String toVariableName) {
        this.fromVariableName = fromVariableName;
        this.toVariableName = toVariableName;
    }

    @Override
    public void meet(Var node) throws RuntimeException {
        super.meet(node);
        String varName = node.getName();
        if (varName.equals(fromVariableName)) {
            node.setName(toVariableName);
        }
    }

    @Override
    public void meet(Projection node) throws RuntimeException {
        super.meet(node);
        node.getProjectionElemList().getElements().forEach(element -> {
            if (element.getSourceName().equals(fromVariableName)) {
                element.setSourceName(toVariableName);
            }
            if (element.getTargetName().equals(fromVariableName)) {
                element.setTargetName(toVariableName);
            }
        });
    }

    @Override
    public void meet(ExtensionElem node) throws RuntimeException {
        super.meet(node);

        // handle BIND(FOO(42) as ?from) function calls
        if (node.getName().equals(fromVariableName)) {
            node.setName(toVariableName);
        }
    }

    @Override
    public void meet(BindingSetAssignment node) throws RuntimeException {
        super.meet(node);

        // handle VALUES() blocks
        if (node.getAssuredBindingNames().contains(fromVariableName)) {
            Set<String> resultNames = new HashSet<>();
            List<BindingSet> resultSets = new ArrayList<>();

            node.getBindingSets().forEach(set -> {
                BindingSet resultSet = set.hasBinding(fromVariableName) ? rewriteBindingSet(set) : set;
                resultSets.add(resultSet);
                resultNames.addAll(resultSet.getBindingNames());
            });

            node.setBindingSets(resultSets);
            node.setBindingNames(resultNames);
        }
    }

    private BindingSet rewriteBindingSet(BindingSet sourceSet) {
        MapBindingSet resultSet = new MapBindingSet(sourceSet.size());
        for (Binding binding : sourceSet) {
            Binding transformed = binding.getName().equals(fromVariableName)
                    ? new SimpleBinding(toVariableName, binding.getValue())
                    : binding;
            resultSet.addBinding(transformed);
        }
        return resultSet;
    }
}
