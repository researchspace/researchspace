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

package org.eclipse.rdf4j.query.parser.sparql;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.algebra.AggregateOperator;
import org.eclipse.rdf4j.query.algebra.Avg;
import org.eclipse.rdf4j.query.algebra.Count;
import org.eclipse.rdf4j.query.algebra.Distinct;
import org.eclipse.rdf4j.query.algebra.Extension;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.FunctionCall;
import org.eclipse.rdf4j.query.algebra.Group;
import org.eclipse.rdf4j.query.algebra.GroupConcat;
import org.eclipse.rdf4j.query.algebra.GroupElem;
import org.eclipse.rdf4j.query.algebra.Max;
import org.eclipse.rdf4j.query.algebra.Min;
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.algebra.ProjectionElemList;
import org.eclipse.rdf4j.query.algebra.Reduced;
import org.eclipse.rdf4j.query.algebra.Sample;
import org.eclipse.rdf4j.query.algebra.Sum;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.sparql.GraphPattern;
import org.eclipse.rdf4j.query.parser.sparql.TupleExprBuilder;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTProjectionElem;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTSelect;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTVar;
import org.eclipse.rdf4j.query.parser.sparql.ast.Node;
import org.eclipse.rdf4j.query.parser.sparql.ast.VisitorException;
import org.researchspace.federation.repository.AggregateService;
import org.researchspace.federation.repository.MpFederation;
import org.researchspace.federation.sparql.algebra.ServiceCallAggregate;

/**
 * Custom modification of {@link TupleExprBuilder} for processing custom
 * aggregation functions.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpTupleExprBuilder extends TupleExprBuilder {

    private class GroupFinder extends AbstractQueryModelVisitor<VisitorException> {

        private Group group;

        @Override
        public void meet(Projection projection) {
            // stop tree traversal on finding a projection: we do not wish to
            // find
            // the group in a sub-select.
        }

        @Override
        public void meet(Group group) {
            this.group = group;
        }

        public Group getGroup() {
            return group;
        }
    }

    protected class VarCollector extends AbstractQueryModelVisitor<VisitorException> {

        private final Set<Var> collectedVars = new HashSet<Var>();

        @Override
        public void meet(Var var) {
            collectedVars.add(var);
        }

        /**
         * @return Returns the collectedVars.
         */
        public Set<Var> getCollectedVars() {
            return collectedVars;
        }

    }

    static class AggregateCollector extends AbstractQueryModelVisitor<VisitorException> {

        private ValueFactory VF = SimpleValueFactory.getInstance();
        private Collection<AggregateOperator> operators = new ArrayList<AggregateOperator>();
        private final MpFederation federation;
        private ValueExpr expression;

        public AggregateCollector(MpFederation federation, ValueExpr expression) {
            this.federation = federation;
            this.expression = expression;
        }

        public ValueExpr process() throws VisitorException {
            expression.visit(this);
            return expression;
        }

        public Collection<AggregateOperator> getOperators() {
            return operators;
        }

        @Override
        public void meet(FunctionCall node) throws VisitorException {
            String uri = node.getURI();
            IRI iri = VF.createIRI(uri);
            AggregateService service = this.federation.getAggregateService(iri);
            if (service != null) {
                ServiceCallAggregate expr = new ServiceCallAggregate(uri, node.getArgs().get(0));
                if (node.getParentNode() != null) {
                    node.getParentNode().replaceChildNode(node, expr);
                } else if (this.expression.equals(node)) {
                    this.expression = expr;
                }
                super.meetOther(expr);
                meetAggregate(expr);
            } else {
                super.meet(node);
            }

        }

        @Override
        public void meet(Avg node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(Count node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(GroupConcat node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(Max node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(Min node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(Sample node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        @Override
        public void meet(Sum node) throws VisitorException {
            super.meet(node);
            meetAggregate(node);
        }

        private void meetAggregate(AggregateOperator node) {
            operators.add(node);
        }

    }

    protected final MpFederation federation;

    public MpTupleExprBuilder(MpFederation federation, ValueFactory valueFactory) {
        super(valueFactory);
        this.federation = federation;
        // TODO Auto-generated constructor stub
    }

    @Override
    public TupleExpr visit(ASTSelect node, Object data) throws VisitorException {
        TupleExpr result = (TupleExpr) data;

        final Order orderClause = result instanceof Order ? (Order) result : null;

        Extension extension = new Extension();

        ProjectionElemList projElemList = new ProjectionElemList();

        GroupFinder groupFinder = new GroupFinder();
        result.visit(groupFinder);
        Group group = groupFinder.getGroup();
        boolean existingGroup = group != null;

        List<String> aliasesInProjection = new ArrayList<String>();
        for (ASTProjectionElem projElemNode : node.getProjectionElemList()) {

            Node child = projElemNode.jjtGetChild(0);

            String alias = projElemNode.getAlias();
            if (alias != null) {
                // aliased projection element
                if (aliasesInProjection.contains(alias)) {
                    throw new VisitorException("duplicate use of alias '" + alias + "' in projection.");
                }

                // check if alias is not previously used.
                if (result.getBindingNames().contains(alias)) {
                    throw new VisitorException("projection alias '" + alias + "' was previously used");
                }

                aliasesInProjection.add(alias);

                ValueExpr valueExpr = (ValueExpr) child.jjtAccept(this, null);

                String targetName = alias;
                String sourceName = alias;
                if (child instanceof ASTVar) {
                    sourceName = ((ASTVar) child).getName();
                }
                ProjectionElem elem = new ProjectionElem(sourceName, targetName);
                projElemList.addElement(elem);

                AggregateCollector collector = new AggregateCollector(this.federation, valueExpr);
                valueExpr = collector.process();

                if (collector.getOperators().size() > 0) {
                    elem.setAggregateOperatorInExpression(true);
                    for (AggregateOperator operator : collector.getOperators()) {
                        // Apply implicit grouping if necessary
                        if (group == null) {
                            group = new Group(result);
                        }

                        if (operator.equals(valueExpr)) {
                            group.addGroupElement(new GroupElem(alias, operator));
                            extension.setArg(group);
                        } else {
                            ValueExpr expr = (ValueExpr) operator.getParentNode();

                            Extension anonymousExtension = new Extension();
                            Var anonVar = createAnonVar();
                            expr.replaceChildNode(operator, anonVar);
                            anonymousExtension.addElement(new ExtensionElem(operator, anonVar.getName()));

                            anonymousExtension.setArg(result);
                            result = anonymousExtension;
                            group.addGroupElement(new GroupElem(anonVar.getName(), operator));

                        }

                        if (!existingGroup) {
                            result = group;
                        }
                    }
                }

                // add extension element reference to the projection element and
                // to
                // the extension
                ExtensionElem extElem = new ExtensionElem(valueExpr, alias);
                extension.addElement(extElem);
                elem.setSourceExpression(extElem);
            } else if (child instanceof ASTVar) {
                Var projVar = (Var) child.jjtAccept(this, null);
                ProjectionElem elem = new ProjectionElem(projVar.getName());
                projElemList.addElement(elem);

                VarCollector whereClauseVarCollector = new VarCollector();
                result.visit(whereClauseVarCollector);

                if (!whereClauseVarCollector.collectedVars.contains(projVar)) {
                    ExtensionElem extElem = new ExtensionElem(projVar, projVar.getName());
                    extension.addElement(extElem);
                    elem.setSourceExpression(extElem);
                }
            } else {
                throw new IllegalStateException("required alias for non-Var projection elements not found");
            }
        }

        if (!extension.getElements().isEmpty()) {
            if (orderClause != null) {
                // Extensions produced by SELECT expressions should be nested
                // inside
                // the ORDER BY clause, to make sure
                // sorting can work on the newly introduced variable. See
                // SES-892
                // and SES-1809.
                TupleExpr arg = orderClause.getArg();
                extension.setArg(arg);
                orderClause.setArg(extension);
                result = orderClause;
            } else {
                extension.setArg(result);
                result = extension;
            }
        }

        result = new Projection(result, projElemList);

        if (group != null) {
            for (ProjectionElem elem : projElemList.getElements()) {
                if (!elem.hasAggregateOperatorInExpression()) {
                    Set<String> groupNames = group.getBindingNames();

                    ExtensionElem extElem = elem.getSourceExpression();
                    if (extElem != null) {
                        ValueExpr expr = extElem.getExpr();

                        VarCollector collector = new VarCollector();
                        expr.visit(collector);

                        for (Var var : collector.getCollectedVars()) {
                            if (!groupNames.contains(var.getName())) {
                                throw new VisitorException(
                                        "variable '" + var.getName() + "' in projection not present in GROUP BY.");

                            }
                        }
                    } else {
                        if (!groupNames.contains(elem.getTargetName())) {
                            throw new VisitorException(
                                    "variable '" + elem.getTargetName() + "' in projection not present in GROUP BY.");
                        } else if (!groupNames.contains(elem.getSourceName())) {
                            throw new VisitorException(
                                    "variable '" + elem.getSourceName() + "' in projection not present in GROUP BY.");

                        }
                    }
                }
            }
        }

        if (node.isSubSelect()) {
            // set context var at the level of the projection. This allows us
            // to distinguish named graphs selected in the
            // outer query from named graphs selected as part of the sub-select.
            ((Projection) result).setProjectionContext(getGraphPattern().getContextVar());
        }

        if (node.isDistinct()) {
            result = new Distinct(result);
        } else if (node.isReduced()) {
            result = new Reduced(result);
        }

        return result;
    }

    public GraphPattern getGraphPattern() {
        return graphPattern;
    }
}
