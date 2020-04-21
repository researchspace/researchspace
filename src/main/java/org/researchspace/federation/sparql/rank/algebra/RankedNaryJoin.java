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

package org.researchspace.federation.sparql.rank.algebra;

import java.util.List;

import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

import com.google.common.collect.Lists;

/**
 * A rank-aware modification of {@link NaryJoin}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class RankedNaryJoin extends NaryJoin implements RankedTupleExpr {

    /**
     * 
     */
    private static final long serialVersionUID = -5736615910922362912L;

    List<OrderElem> orderElements;
    List<TupleExpr> sortedArgs;
    List<TupleExpr> unsortedArgs;
    boolean isLimited = false;
    long limit = Long.MAX_VALUE;

    public RankedNaryJoin(List<TupleExpr> sortedArgs, List<TupleExpr> unsortedArgs, List<OrderElem> orderElements) {
        super(Lists.newArrayList(sortedArgs));
        for (TupleExpr unsorted : unsortedArgs) {
            this.addArg(unsorted);
            unsorted.setParentNode(this);
        }
        this.orderElements = orderElements;
        this.sortedArgs = sortedArgs;
        this.unsortedArgs = unsortedArgs;
    }

    @Override
    public List<OrderElem> getOrderElements() {
        return orderElements;
    }

    @Override
    public List<? extends TupleExpr> getArgs() {
        return super.getArgs();
    }

    @Override
    public int getNumberOfArguments() {
        return super.getNumberOfArguments();
    }

    @Override
    public boolean removeArg(TupleExpr arg) {
        return super.removeArg(arg);
    }

    public long getLimit() {
        return limit;
    }

    public void setLimit(long limit) {
        isLimited = true;
        this.limit = limit;
    }

    public boolean isSorted(TupleExpr childNode) {
        if (sortedArgs.contains(childNode))
            return true;
        if (unsortedArgs.contains(childNode))
            return false;
        throw new IllegalArgumentException(
                "The element " + childNode.getSignature() + " is not a child of this rank join ");
    }

    public void makeChildSorted(TupleExpr childNode, OrderElem elem) {
        if (childNode == null)
            throw new IllegalArgumentException("childNode must not be null");
        if (elem == null)
            throw new IllegalArgumentException("elem must not be null");

        boolean alreadyOrdered = false;
        TupleExpr alreadySortedNode = null;
        TupleExpr unsortedNode = null;
        for (OrderElem element : this.orderElements) {
            if (elem.equals(element)) {
                alreadyOrdered = true;
                break;
            }
        }

        for (TupleExpr child : this.sortedArgs) {
            if (child.equals(childNode)) {
                alreadySortedNode = child;
                break;
            }
        }

        for (TupleExpr child : this.unsortedArgs) {
            if (child.equals(childNode)) {
                unsortedNode = child;
                break;
            }
        }

        if (unsortedNode == null && alreadySortedNode == null) {
            throw new IllegalArgumentException("Argument is not among the children of this node");
        }

        if (unsortedNode != null) {
            unsortedArgs.remove(unsortedNode);
            this.removeArg(unsortedNode);
        }

        if (alreadySortedNode == null) {
            sortedArgs.add(childNode);
            this.addArg(childNode);
            childNode.setParentNode(this);
        }

        if (!alreadyOrdered) {
            this.orderElements.add(elem);
        }

    }

    @Override
    public void replaceChildNode(QueryModelNode current, QueryModelNode replacement) {
        super.replaceChildNode(current, replacement);
        int index = this.sortedArgs.indexOf(current);
        if (index >= 0) {
            this.sortedArgs.set(index, (TupleExpr) replacement);
        } else {
            index = this.unsortedArgs.indexOf(current);
            if (index >= 0)
                this.unsortedArgs.set(index, (TupleExpr) replacement);
        }

    }

    @Override
    public <X extends Exception> void visitChildren(QueryModelVisitor<X> visitor) throws X {

        for (OrderElem elem : orderElements)
            elem.visitChildren(visitor);

        super.visitChildren(visitor);
    }

}