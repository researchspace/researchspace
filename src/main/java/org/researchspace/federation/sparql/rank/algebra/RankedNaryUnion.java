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
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.researchspace.federation.sparql.NaryUnion;

import com.google.common.collect.Lists;

/**
 * Rank-aware modification of {@link NaryUnion}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class RankedNaryUnion extends NaryUnion implements RankedTupleExpr {

    /**
     * 
     */
    private static final long serialVersionUID = -4436912670064079715L;

    protected List<OrderElem> orderElements;
    protected List<TupleExpr> sortedArgs;
    protected List<TupleExpr> unsortedArgs;
    boolean isLimited = false;
    int limit = Integer.MAX_VALUE;

    public RankedNaryUnion(List<TupleExpr> sortedArgs, List<TupleExpr> unsortedArgs, List<OrderElem> orderElements) {
        super(Lists.newArrayList(sortedArgs));
        for (TupleExpr arg : unsortedArgs) {
            addArg(arg);
            arg.setParentNode(this);
        }
        this.sortedArgs = sortedArgs;
        this.unsortedArgs = unsortedArgs;
        this.orderElements = orderElements;
    }

    @Override
    public List<OrderElem> getOrderElements() {
        return orderElements;
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
    public <X extends Exception> void visitChildren(QueryModelVisitor<X> visitor) throws X {

        for (OrderElem elem : orderElements)
            elem.visitChildren(visitor);

        super.visitChildren(visitor);
    }

    /**
     * @return the limit
     */
    public int getLimit() {
        return limit;
    }

    /**
     * @param limit the limit to set
     */
    public void setLimit(int limit) {
        isLimited = true;
        this.limit = limit;
    }

}