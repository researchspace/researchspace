/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.UpdateExpr;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedOperation;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.ParsedUpdate;
import org.eclipse.rdf4j.queryrender.BaseTupleExprRenderer;
import org.eclipse.rdf4j.queryrender.QueryRenderer;
import org.eclipse.rdf4j.queryrender.sparql.SPARQLQueryRenderer;

/**
 * An alternative implementation of the SPARQL query renderer (more complete than the RDF4J
 * {@link SPARQLQueryRenderer}) that doesn't cover, e.g.,
 * <ul>
 * <li>SERVICE clauses</li>
 * <li>GROUP BY aggregations</li>
 * <li>subqueries</li>
 * </ul>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpSparqlQueryRenderer extends BaseTupleExprRenderer implements QueryRenderer {

    public MpSparqlQueryRenderer() {

    }

    @Override
    public QueryLanguage getLanguage() {
        return QueryLanguage.SPARQL;
    }

    @Override
    public String render(ParsedQuery theQuery) throws Exception {
        if (theQuery instanceof ParsedTupleQuery) {
            ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
            PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
            SerializableParsedTupleQuery toSerialize = parserVisitor
                    .transformToSerialize((ParsedTupleQuery) theQuery);
            return serializerVisitor.serialize(toSerialize);
        } else if (theQuery instanceof ParsedBooleanQuery) { 
            ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
            PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
            SerializableParsedBooleanQuery toSerialize = parserVisitor
                    .transformToSerialize((ParsedBooleanQuery)theQuery);
            return serializerVisitor.serialize(toSerialize);
        } else if (theQuery instanceof ParsedGraphQuery) {
            ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
            PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
            SerializableParsedConstructQuery toSerialize = parserVisitor
                    .transformToSerialize((ParsedGraphQuery)theQuery);
            return serializerVisitor.serialize(toSerialize);
        } else {
            throw new UnsupportedOperationException("Only SELECT, ASK, and CONSTRUCT queries are supported");
        }
    }
    
    public String render(ParsedOperation theOperation) throws Exception {
        if (theOperation instanceof ParsedQuery) {
            return render((ParsedQuery) theOperation);
        } else if (theOperation instanceof ParsedUpdate) {
            return renderUpdate((ParsedUpdate) theOperation);
        }
        
        throw new UnsupportedOperationException("Only ParsedQuery and ParsedUpdate operations are supported");
    }
    
    public String renderUpdate(ParsedUpdate theUpdate) throws Exception {
        StringBuilder exprBuilder = new StringBuilder();
        boolean multipleExpressions = (theUpdate.getUpdateExprs().size() > 1);
        
        for (UpdateExpr updateExpr : theUpdate.getUpdateExprs()) {
            ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
            PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
            SerializableParsedUpdate toSerialize = parserVisitor
                    .transformToSerialize((UpdateExpr) updateExpr, theUpdate.getDatasetMapping().get(updateExpr));
            exprBuilder.append(serializerVisitor.serialize(toSerialize));
            if (multipleExpressions) {
                exprBuilder.append(";\n");
            }
        }
        return exprBuilder.toString();
    }
    
    @Override
    public String render(TupleExpr theExpr) throws Exception {
        ParsedQueryPreprocessor parserVisitor = new ParsedQueryPreprocessor();
        PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
        SerializableParsedTupleQuery toSerialize = parserVisitor.transformToSerialize(theExpr);
        return serializerVisitor.serialize(toSerialize);
    }

    @Override
    public String renderValueExpr(ValueExpr theExpr) throws Exception {
        PreprocessedQuerySerializer serializerVisitor = new PreprocessedQuerySerializer();
        theExpr.visit(serializerVisitor);
        return serializerVisitor.builder.toString();
    }

    /**
     * Renders a single {@link Value} as string.
     * 
     * @param val
     *            an RDF {@link Value}
     * @return string representation of {@code val}
     */
    public String renderValue(Value val) {
        StringBuilder builder = new StringBuilder();
        MpSparqlQueryRendererUtils.writeAsSparqlValue(val, builder, true);
        return builder.toString();
    }

}