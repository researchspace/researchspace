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

import java.util.List;

import org.eclipse.rdf4j.query.algebra.TupleExpr;

import com.google.common.collect.Lists;

public class QueryHintsSetup {

    protected List<TupleExpr> executeFirst = Lists.newArrayList();
    protected List<TupleExpr> executeLast = Lists.newArrayList();
    protected boolean disableReordering = false;

    public QueryHintsSetup() {
    }

    public List<TupleExpr> getExecuteFirst() {
        return executeFirst;
    }

    public List<TupleExpr> getExecuteLast() {
        return executeLast;
    }

    public void addExecuteFirst(TupleExpr expr) {
        this.executeFirst.add(expr);
    }

    public void addExecuteLast(TupleExpr expr) {
        this.executeLast.add(expr);
    }

    public boolean isDisableReordering() {
        return disableReordering;
    }

    public void replaceExprIfExists(TupleExpr source, TupleExpr target) {
        int idx;
        if ((idx = executeFirst.indexOf(source)) != -1) {
            executeFirst.set(idx, target);
        }
        if ((idx = executeLast.indexOf(source)) != -1) {
            executeLast.set(idx, target);
        }
    }

}
