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

package org.researchspace.federation.sparql.parser;

import java.util.Map;

import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.IncompatibleOperationException;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.parser.ParsedBooleanQuery;
import org.eclipse.rdf4j.query.parser.ParsedDescribeQuery;
import org.eclipse.rdf4j.query.parser.ParsedGraphQuery;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.sparql.BaseDeclProcessor;
import org.eclipse.rdf4j.query.parser.sparql.BlankNodeVarProcessor;
import org.eclipse.rdf4j.query.parser.sparql.DatasetDeclProcessor;
import org.eclipse.rdf4j.query.parser.sparql.MpTupleExprBuilder;
import org.eclipse.rdf4j.query.parser.sparql.PrefixDeclProcessor;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;
import org.eclipse.rdf4j.query.parser.sparql.StringEscapesProcessor;
import org.eclipse.rdf4j.query.parser.sparql.TupleExprBuilder;
import org.eclipse.rdf4j.query.parser.sparql.WildcardProjectionProcessor;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTAskQuery;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTConstructQuery;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTDescribeQuery;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTQuery;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTQueryContainer;
import org.eclipse.rdf4j.query.parser.sparql.ast.ASTSelectQuery;
import org.eclipse.rdf4j.query.parser.sparql.ast.Node;
import org.eclipse.rdf4j.query.parser.sparql.ast.ParseException;
import org.eclipse.rdf4j.query.parser.sparql.ast.SyntaxTreeBuilder;
import org.eclipse.rdf4j.query.parser.sparql.ast.TokenMgrError;
import org.eclipse.rdf4j.query.parser.sparql.ast.VisitorException;
import org.researchspace.federation.repository.MpFederation;

/**
 * A custom modification of {@link SPARQLParser} able to process custom
 * aggregation functions.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpSPARQLParser extends SPARQLParser {

    protected final MpFederation federation;

    public MpSPARQLParser(MpFederation federation) {
        this.federation = federation;
    }

    @Override
    public ParsedQuery parseQuery(String queryStr, String baseURI) throws MalformedQueryException {
        try {
            ASTQueryContainer qc = SyntaxTreeBuilder.parseQuery(queryStr);
            StringEscapesProcessor.process(qc);
            BaseDeclProcessor.process(qc, baseURI);
            Map<String, String> prefixes = PrefixDeclProcessor.process(qc);
            WildcardProjectionProcessor.process(qc);
            BlankNodeVarProcessor.process(qc);

            if (qc.containsQuery()) {

                // handle query operation

                TupleExpr tupleExpr = buildMpQueryModel(qc);

                ParsedQuery query;

                ASTQuery queryNode = qc.getQuery();
                if (queryNode instanceof ASTSelectQuery) {
                    query = new ParsedTupleQuery(queryStr, tupleExpr);
                } else if (queryNode instanceof ASTConstructQuery) {
                    query = new ParsedGraphQuery(queryStr, tupleExpr, prefixes);
                } else if (queryNode instanceof ASTAskQuery) {
                    query = new ParsedBooleanQuery(queryStr, tupleExpr);
                } else if (queryNode instanceof ASTDescribeQuery) {
                    query = new ParsedDescribeQuery(queryStr, tupleExpr, prefixes);
                } else {
                    throw new RuntimeException("Unexpected query type: " + queryNode.getClass());
                }

                // Handle dataset declaration
                Dataset dataset = DatasetDeclProcessor.process(qc);
                if (dataset != null) {
                    query.setDataset(dataset);
                }

                return query;
            } else {
                throw new IncompatibleOperationException("supplied string is not a query operation");
            }
        } catch (ParseException e) {
            throw new MalformedQueryException(e.getMessage(), e);
        } catch (TokenMgrError e) {
            throw new MalformedQueryException(e.getMessage(), e);
        }
    }

    private TupleExpr buildMpQueryModel(Node qc) throws MalformedQueryException {
        TupleExprBuilder tupleExprBuilder = new MpTupleExprBuilder(this.federation, SimpleValueFactory.getInstance());
        try {
            return (TupleExpr) qc.jjtAccept(tupleExprBuilder, null);
        } catch (VisitorException e) {
            throw new MalformedQueryException(e.getMessage(), e);
        }
    }

}