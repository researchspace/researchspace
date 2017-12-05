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

package com.metaphacts.sparql.renderer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.util.Literals;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.Add;
import org.eclipse.rdf4j.query.algebra.And;
import org.eclipse.rdf4j.query.algebra.ArbitraryLengthPath;
import org.eclipse.rdf4j.query.algebra.Avg;
import org.eclipse.rdf4j.query.algebra.BNodeGenerator;
import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.Bound;
import org.eclipse.rdf4j.query.algebra.Clear;
import org.eclipse.rdf4j.query.algebra.Coalesce;
import org.eclipse.rdf4j.query.algebra.Compare;
import org.eclipse.rdf4j.query.algebra.CompareAll;
import org.eclipse.rdf4j.query.algebra.CompareAny;
import org.eclipse.rdf4j.query.algebra.Copy;
import org.eclipse.rdf4j.query.algebra.Count;
import org.eclipse.rdf4j.query.algebra.Create;
import org.eclipse.rdf4j.query.algebra.Datatype;
import org.eclipse.rdf4j.query.algebra.DeleteData;
import org.eclipse.rdf4j.query.algebra.Difference;
import org.eclipse.rdf4j.query.algebra.Distinct;
import org.eclipse.rdf4j.query.algebra.EmptySet;
import org.eclipse.rdf4j.query.algebra.Exists;
import org.eclipse.rdf4j.query.algebra.Extension;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.Filter;
import org.eclipse.rdf4j.query.algebra.FunctionCall;
import org.eclipse.rdf4j.query.algebra.Group;
import org.eclipse.rdf4j.query.algebra.GroupConcat;
import org.eclipse.rdf4j.query.algebra.GroupElem;
import org.eclipse.rdf4j.query.algebra.IRIFunction;
import org.eclipse.rdf4j.query.algebra.If;
import org.eclipse.rdf4j.query.algebra.In;
import org.eclipse.rdf4j.query.algebra.InsertData;
import org.eclipse.rdf4j.query.algebra.Intersection;
import org.eclipse.rdf4j.query.algebra.IsBNode;
import org.eclipse.rdf4j.query.algebra.IsLiteral;
import org.eclipse.rdf4j.query.algebra.IsNumeric;
import org.eclipse.rdf4j.query.algebra.IsResource;
import org.eclipse.rdf4j.query.algebra.IsURI;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.Label;
import org.eclipse.rdf4j.query.algebra.Lang;
import org.eclipse.rdf4j.query.algebra.LangMatches;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.Like;
import org.eclipse.rdf4j.query.algebra.Load;
import org.eclipse.rdf4j.query.algebra.LocalName;
import org.eclipse.rdf4j.query.algebra.MathExpr;
import org.eclipse.rdf4j.query.algebra.Max;
import org.eclipse.rdf4j.query.algebra.Min;
import org.eclipse.rdf4j.query.algebra.Modify;
import org.eclipse.rdf4j.query.algebra.Move;
import org.eclipse.rdf4j.query.algebra.MultiProjection;
import org.eclipse.rdf4j.query.algebra.Namespace;
import org.eclipse.rdf4j.query.algebra.Not;
import org.eclipse.rdf4j.query.algebra.Or;
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.OrderElem;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.algebra.ProjectionElemList;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.QueryRoot;
import org.eclipse.rdf4j.query.algebra.Reduced;
import org.eclipse.rdf4j.query.algebra.Regex;
import org.eclipse.rdf4j.query.algebra.SameTerm;
import org.eclipse.rdf4j.query.algebra.Sample;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.SingletonSet;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Str;
import org.eclipse.rdf4j.query.algebra.Sum;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.ValueConstant;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.ZeroLengthPath;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLUtil;
import org.eclipse.rdf4j.queryrender.RenderUtils;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;

import com.google.common.collect.Lists;
import com.metaphacts.sparql.renderer.SerializableParsedTupleQuery.QueryModifier;

/**
 * This class processes a {@link SerializableParsedTupleQuery} and renders it as a SPARQL string.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class PreprocessedQuerySerializer extends AbstractQueryModelVisitor<RuntimeException> {

    protected Map<Projection, SerializableParsedTupleQuery> queriesByProjection = new HashMap<Projection, SerializableParsedTupleQuery>();

    protected SerializableParsedTupleQuery currentQueryProfile = null;

    protected StringBuilder builder;

    public PreprocessedQuerySerializer() {
        this.builder = new StringBuilder();
    }

    /**
     * Serializes a {@link SerializableParsedTupleQuery} passed as an input.
     * 
     * @param query
     *            a parsed tuple query previously produced by {@link ParsedQueryPreprocessor}
     * @return string SPARQL serialization of the query
     */
    public String serialize(SerializableParsedTupleQuery query) {

        this.builder = new StringBuilder();

        this.queriesByProjection.putAll(query.subQueriesByProjection);

        processQuery(query);

        return builder.toString().trim();
    }

    private void processQuery(SerializableParsedTupleQuery query) {

        final SerializableParsedTupleQuery prevQuery = this.currentQueryProfile;
        this.currentQueryProfile = query;

        if (query.projection != null) {
            builder.append("SELECT ");

            if (query.modifier != null) {
                if (query.modifier.equals(QueryModifier.DISTINCT)) {
                    builder.append("DISTINCT ");
                } else if (query.modifier.equals(QueryModifier.REDUCED)) {
                    builder.append("REDUCED ");
                }
            }
            this.meet(query.projection.getProjectionElemList());
            builder.append("\nWHERE ");
        }
        builder.append("{ \n");

        this.meetWhereClause(query.whereClause);

        builder.append(" }\n ");

        if (query.groupBy != null) {
            this.meet(query.groupBy);
            if (query.having != null) {
                builder.append("HAVING (");
                query.having.getCondition().visit(this);
                builder.append(") ");
            }
            builder.append("\n");
        }

        if (query.orderBy != null) {
            this.meet(query.orderBy);
            builder.append("\n");
        }

        if (query.limit != null) {
            this.writeLimit(query.limit);
            builder.append("\n");
        }

        if (query.bindings != null) {
            this.meet(query.bindings);
            builder.append("\n");
        }

        this.currentQueryProfile = prevQuery;
    }

    /**
     * Serializes the TupleExpr serving as a WHERE clause of the query.
     * 
     * @param whereClause
     *            a TupleExpr representing a WHERE clause
     */
    public void meetWhereClause(TupleExpr whereClause) {
        whereClause.visit(this);
    }

    @Override
    public void meet(QueryRoot node) throws RuntimeException {
        super.meet(node);
    }

    @Override
    public void meet(Add add) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(And node) throws RuntimeException {
        node.getLeftArg().visit(this);
        builder.append(" && ");
        node.getRightArg().visit(this);
    }

    @Override
    public void meet(ArbitraryLengthPath node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Avg node) throws RuntimeException {
        writeAsFunction("AVG", node.getArg());
    }

    public void meet(Value node) {
        writeAsSparqlValue(node);
    }

    @Override
    public void meet(BindingSetAssignment node) throws RuntimeException {

        List<String> bindingNames = new ArrayList<String>(node.getBindingNames());

        builder.append("VALUES (");
        for (String var : bindingNames) {
            builder.append("?");
            builder.append(var);
            builder.append(" ");
        }

        builder.append(") { ");
        for (BindingSet bs : node.getBindingSets()) {
            builder.append("(");
            for (String s : bindingNames) {
                if (bs.getValue(s) != null) {
                    this.meet(bs.getValue(s));
                } else {
                    builder.append("UNDEF ");
                }
            }
            builder.append(") ");
        }
        builder.append(" } ");
    }

    @Override
    public void meet(BNodeGenerator node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Bound node) throws RuntimeException {
        writeAsFunction("BOUND", node.getArg());
    }

    @Override
    public void meet(Clear clear) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");

    }

    @Override
    public void meet(Coalesce node) throws RuntimeException {
        writeAsFunction("COALESCE", node.getArguments());
    }

    @Override
    public void meet(Compare node) throws RuntimeException {
        node.getLeftArg().visit(this);
        builder.append(" ");
        builder.append(node.getOperator().getSymbol());
        builder.append(" ");
        node.getRightArg().visit(this);
    }

    @Override
    public void meet(CompareAll node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(CompareAny node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Copy copy) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");

    }

    @Override
    public void meet(Count node) throws RuntimeException {
        writeAsAggregationFunction("COUNT", node.getArg(), node.isDistinct());
    }

    @Override
    public void meet(Create create) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(Datatype node) throws RuntimeException {
        writeAsFunction("DATATYPE", node.getArg());
    }

    @Override
    public void meet(DeleteData deleteData) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(Difference node) throws RuntimeException {
        builder.append("{\n");

        node.getLeftArg().visit(this);

        builder.append("}\n MINUS\n{\n");

        node.getRightArg().visit(this);

        builder.append("}\n");
    }

    @Override
    public void meet(Distinct node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(EmptySet node) throws RuntimeException {
        super.meet(node);
    }

    @Override
    public void meet(Exists node) throws RuntimeException {
        builder.append("EXISTS {");
        node.getSubQuery().visit(this);
        builder.append("} ");
    }

    @Override
    public void meet(Extension node) throws RuntimeException {
        node.getArg().visit(this);
        for (ExtensionElem element : node.getElements()) {
            if (!isTautologicalExtensionElem(element)) {
                builder.append("\tBIND (");
                element.visit(this);
                builder.append(") . \n");
            }

        }
    }

    @Override
    public void meet(ExtensionElem node) throws RuntimeException {
        node.getExpr().visit(this);
        builder.append(" AS ?");
        builder.append(node.getName());
    }

    @Override
    public void meet(Filter node) throws RuntimeException {
        if (!node.equals(currentQueryProfile.having)) {
            node.getArg().visit(this);
            builder.append(" FILTER ");
            builder.append("(");
            node.getCondition().visit(this);
            builder.append(") ");
        }
    }

    @Override
    public void meet(FunctionCall node) throws RuntimeException {
        // RDF4J doesn't recognize CONCAT as a built-in function,
        // but assumes that it has the default URI namespace.
        // This leads to failures when sending the query to other triple stores
        // like Blazegraph
        writeAsFunction(getFunctionNameAsString(node), node.getArgs());
    }

    @Override
    public void meet(Group node) throws RuntimeException {
        builder.append("GROUP BY ");
        for (String name : node.getGroupBindingNames()) {
            builder.append("?");
            builder.append(name);
            builder.append(" ");
        }
    }

    @Override
    public void meet(GroupConcat node) throws RuntimeException {
        builder.append("GROUP_CONCAT(");
        if (node.isDistinct()) {
            builder.append("DISTINCT ");
        }
        node.getArg().visit(this);
        builder.append(";separator=");
        node.getSeparator().visit(this);
        builder.append(") ");
    }

    @Override
    public void meet(GroupElem node) throws RuntimeException {
        super.meet(node);
    }

    @Override
    public void meet(If node) throws RuntimeException {
        writeAsFunction("IF",
                Lists.newArrayList(node.getCondition(), node.getResult(), node.getAlternative()));
    }

    @Override
    public void meet(In node) throws RuntimeException {
        super.meet(node);
    }

    @Override
    public void meet(InsertData insertData) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(Intersection node) throws RuntimeException {
        throw new UnsupportedOperationException("Unsupported operator: Intersection");
    }

    @Override
    public void meet(IRIFunction node) throws RuntimeException {
        writeAsFunction("IRI", node.getArg());
    }

    @Override
    public void meet(IsBNode node) throws RuntimeException {
        writeAsFunction("isBNODE", node.getArg());
    }

    @Override
    public void meet(IsLiteral node) throws RuntimeException {
        writeAsFunction("isLITERAL", node.getArg());
    }

    @Override
    public void meet(IsNumeric node) throws RuntimeException {
        writeAsFunction("isNUMERIC", node.getArg());

    }

    @Override
    public void meet(IsResource node) throws RuntimeException {
        writeAsFunction("isRESOURCE", node.getArg());

    }

    @Override
    public void meet(IsURI node) throws RuntimeException {
        writeAsFunction("isURI", node.getArg());

    }

    @Override
    public void meet(Join node) throws RuntimeException {
        node.getLeftArg().visit(this);
        node.getRightArg().visit(this);
    }

    @Override
    public void meet(Label node) throws RuntimeException {
        writeAsFunction("LABEL", node.getArg());

    }

    @Override
    public void meet(Lang node) throws RuntimeException {
        writeAsFunction("LANG", node.getArg());

    }

    @Override
    public void meet(LangMatches node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(LeftJoin node) throws RuntimeException {

        if (currentQueryProfile.whereClause == null) {
            currentQueryProfile.whereClause = node;
        }

        node.getLeftArg().visit(this);
        builder.append(" OPTIONAL { ");
        node.getRightArg().visit(this);
        builder.append("} ");

    }

    @Override
    public void meet(Like node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Load load) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");

    }

    @Override
    public void meet(LocalName node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(MathExpr node) throws RuntimeException {
        builder.append("(");
        node.getLeftArg().visit(this);
        builder.append(node.getOperator().getSymbol());
        node.getRightArg().visit(this);
        builder.append(") ");

    }

    @Override
    public void meet(Max node) throws RuntimeException {
        writeAsAggregationFunction("MAX", node.getArg(), node.isDistinct());
    }

    @Override
    public void meet(Min node) throws RuntimeException {
        writeAsAggregationFunction("MIN", node.getArg(), node.isDistinct());

    }

    @Override
    public void meet(Modify modify) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");

    }

    @Override
    public void meet(Move move) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(MultiProjection node) throws RuntimeException {
        throw new UnsupportedOperationException("Only SELECT queries are supported");
    }

    @Override
    public void meet(Namespace node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Not node) throws RuntimeException {
        builder.append("NOT ");
        super.meet(node);
    }

    @Override
    public void meet(Or node) throws RuntimeException {
        node.getLeftArg().visit(this);
        builder.append(" || ");
        node.getRightArg().visit(this);
    }

    @Override
    public void meet(Order node) throws RuntimeException {

        if (!node.getElements().isEmpty()) {
            builder.append("ORDER BY ");
            for (OrderElem elem : node.getElements()) {
                elem.visit(this);
            }
        }
    }

    @Override
    public void meet(OrderElem node) throws RuntimeException {
        if (!node.isAscending()) {
            builder.append("DESC(");
        }
        node.getExpr().visit(this);
        if (!node.isAscending()) {
            builder.append(")");
        }
        builder.append(" ");
    }

    @Override
    public void meet(Projection node) throws RuntimeException {
        if (!node.equals(this.currentQueryProfile.projection)) {
            builder.append("{ ");
            this.processQuery(this.queriesByProjection.get(node));
            builder.append(" } ");
        }
    }

    @Override
    public void meet(ProjectionElem node) throws RuntimeException {

        if (node.getSourceExpression() == null) {
            if (node.getSourceName() == null || node.getTargetName().equals(node.getSourceName())) {
                builder.append("?");
                builder.append(node.getTargetName());
                builder.append(" ");
            } else {
                builder.append("(");
                builder.append("?");
                builder.append(node.getSourceName());
                builder.append(" ");
                builder.append("AS ");
                builder.append("?");
                builder.append(node.getTargetName());
                builder.append(" ");
                builder.append(") ");
            }
        } else {
            if (!isTautologicalExtensionElem(node.getSourceExpression())) {
                builder.append("(");
                node.getSourceExpression().visit(this);
                builder.append(") ");
            } else {
                builder.append("?");
                builder.append(node.getTargetName());
                builder.append(" ");
            }
        }
    }

    @Override
    public void meet(ProjectionElemList node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Reduced node) throws RuntimeException {
        builder.append("REDUCED ");
        super.meet(node);

    }

    @Override
    public void meet(Regex node) throws RuntimeException {
        writeAsFunction("REGEX",
                Lists.newArrayList(node.getLeftArg(), node.getRightArg(), node.getFlagsArg()));
    }

    @Override
    public void meet(SameTerm node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Sample node) throws RuntimeException {
        writeAsAggregationFunction("SAMPLE", node.getArg(), node.isDistinct());
    }

    @Override
    public void meet(Service node) throws RuntimeException {
        builder.append("SERVICE ");
        node.getServiceRef().visit(this);
        builder.append(" { \n");
        node.getServiceExpr().visit(this);
        builder.append("} \n");
    }

    @Override
    public void meet(SingletonSet node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meet(Slice node) throws RuntimeException {
        node.getArg().visit(this);
    }

    @Override
    public void meet(StatementPattern node) throws RuntimeException {
        boolean isInContext = node.getContextVar() != null;

        if (isInContext) {
            builder.append("GRAPH ");
            node.getContextVar().visit(this);
            builder.append(" { ");
        }
        builder.append("\t");
        node.getSubjectVar().visit(this);
        builder.append(" ");
        node.getPredicateVar().visit(this);
        builder.append(" ");
        node.getObjectVar().visit(this);
        builder.append(" . \n");
        if (isInContext) {
            builder.append(" } \n");
        }
    }

    @Override
    public void meet(Str node) throws RuntimeException {
        writeAsFunction("STR", node.getArg());

    }

    @Override
    public void meet(Sum node) throws RuntimeException {
        writeAsAggregationFunction("SUM", node.getArg(), node.isDistinct());
    }

    @Override
    public void meet(Union node) throws RuntimeException {
        builder.append("{\n");
        node.getLeftArg().visit(this);
        builder.append("}\n UNION\n{\n");
        node.getRightArg().visit(this);
        builder.append("}\n");
    }

    @Override
    public void meet(ValueConstant node) throws RuntimeException {
        this.meet(node.getValue());
    }

    @Override
    public void meet(Var node) throws RuntimeException {

        if (node.hasValue()) {
            this.meet(node.getValue());
        } else {
            builder.append("?");
            builder.append(node.getName());
        }

        super.meet(node);

    }

    @Override
    public void meet(ZeroLengthPath node) throws RuntimeException {
        super.meet(node);

    }

    @Override
    public void meetOther(QueryModelNode node) throws RuntimeException {
        if (node instanceof NaryJoin) {
            NaryJoin joinNode = (NaryJoin) node;
            if (currentQueryProfile.whereClause == null) {
                currentQueryProfile.whereClause = joinNode;
            }
            for (TupleExpr arg : joinNode.getArgs()) {
                arg.visit(this);
            }

        } else {
            super.meetOther(node);
        }
    }

    /**
     * A special case check: we project a variable from a subquery that has the same name We must
     * avoid writing SELECT (?x as ?x) WHERE { { SELECT ?x WHERE { ... } } }
     * 
     */
    private boolean isTautologicalExtensionElem(ExtensionElem val) {
        String varName = val.getName();
        if (val.getExpr() instanceof Var) {
            return (((Var) val.getExpr()).getName().equals(varName));
        }
        return false;
    }

    private void writeAsFunction(String name, ValueExpr arg) {
        builder.append(name);
        builder.append("(");
        arg.visit(this);
        builder.append(") ");
    }

    private void writeAsFunction(String name, List<ValueExpr> args) {
        builder.append(name);
        builder.append("(");
        if (!args.isEmpty()) {
            args.get(0).visit(this);
            for (int i = 1; i < args.size(); i++) {
                builder.append(",");
                args.get(i).visit(this);
            }
        }
        builder.append(") ");
    }

    private void writeLimit(Slice node) throws RuntimeException {
        if (node.getLimit() > -1) {
            builder.append("LIMIT ");
            builder.append(node.getLimit());
            builder.append(" ");
        }
        if (node.getOffset() > 0) {
            builder.append("OFFSET ");
            builder.append(node.getOffset());
            builder.append(" ");
        }
    }

    private void writeAsAggregationFunction(String name, ValueExpr arg, boolean distinct) {
        builder.append(name);
        builder.append("(");
        if (distinct) {
            builder.append("DISTINCT ");
        }
        arg.visit(this);
        builder.append(") ");
    }

    /**
     * The standard {@link RenderUtils#toSPARQL(Value, StringBuilder)} fails with literals (adds
     * extra brackets and messes language tags).
     * 
     */
    public void writeAsSparqlValue(Value value) {
        if (value instanceof IRI) {
            IRI uri = (IRI) value;
            builder.append("<").append(uri.toString()).append(">");
        } else if (value instanceof BNode) {
            builder.append("_:").append(((BNode) value).getID());
        } else if (value instanceof Literal) {
            Literal lit = (Literal) value;

            builder.append("\"").append(SPARQLUtil.encodeString(lit.stringValue())).append("\"");

            if (Literals.isLanguageLiteral(lit)) {
                builder.append("@").append(lit.getLanguage().get());
            } else {
                builder.append("^^<").append(lit.getDatatype().stringValue()).append(">");
            }
        }
    }

    protected String getFunctionNameAsString(FunctionCall expr) {
        String uri = expr.getURI();
        if (StringUtils.isEmpty(uri)) {
            return uri;
        }

        Optional<FNFunction> fnfunc = FNFunction.byUri(uri);

        if (fnfunc.isPresent()) {
            return fnfunc.get().getName();
        } else {
            return "<" + uri + ">";
        }
    }

}
