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

package com.metaphacts.templates.helper;

import static com.google.common.base.Preconditions.checkNotNull;

import java.util.List;

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Operation;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.github.jknack.handlebars.Options;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.templates.TemplateContext;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class HelperUtil {
    private static final String ESCAPE_RESULT_FLAG = "escape";

    /**
     * Takes the {@link TemplateContext} to resolve the current resource
     * (?__this__) and the user (?__useruri__) on the supplied
     * {@link SparqlOperationBuilder}.
     * @param <E>
     * @param <T>
     *
     * @param builder
     * @param context
     * @return
     * @return
     */
    public static <T extends Operation> SparqlOperationBuilder<T> contextualizeSparqlOperation(SparqlOperationBuilder<T> builder, TemplateContext context){
        builder.resolveThis((IRI)context.getValue());
        if(context.getNamespaceRegistry().isPresent()){
            builder.resolveUser(context.getNamespaceRegistry().get().getUserIRI());
        }
        return builder;
    }

    public static class QueryResult {
	public List<BindingSet> bindings;
	public List<String> bindingNames;

        public QueryResult(List<BindingSet> bindings, List<String> bindingNames) {
	    this.bindings = bindings;
	    this.bindingNames = bindingNames;
	}
    }

    public static QueryResult evaluateSelectQuery(
        String param0, Options options, Logger logger
    ) {
        TemplateContext context =  (TemplateContext) options.context.model();
	return evaluateSelectQuery(param0, options, logger, context.getRepository());
    }

    public static QueryResult evaluateSelectQuery(
        String param0, Options options, Logger logger, Repository repository
    ) {
        TemplateContext context =  (TemplateContext) options.context.model();
        String queryString = checkNotNull(param0, "Query string must not be null.");
        try (RepositoryConnection con = repository.getConnection()) {
            SparqlOperationBuilder<Operation> tqb = HelperUtil.contextualizeSparqlOperation(SparqlOperationBuilder.create(queryString), context);
            context.getNamespaceRegistry().map( ns -> tqb.setNamespaces(ns.getPrefixMap()));
            Operation op = tqb.build(con);
            if (!(op instanceof TupleQuery)) {
                throw new IllegalArgumentException("Only SPARQL SELECT queries are supported in "+options.helperName+" template helper.");
            }
            logger.trace("Evaluating SPARQL SELECT in {} Template Helper: {}", options.helperName, queryString);
            try (TupleQueryResult tqr = ((TupleQuery)op).evaluate()){
                return new QueryResult(QueryResults.asList(tqr), tqr.getBindingNames());
            }
        } catch (RepositoryException e) {
            throw new RuntimeException("Repository Exception while evaluating query in \""+options.helperName+"\" template helper: "+queryString, e);
        } catch (MalformedQueryException e) {
            throw new IllegalArgumentException("Malformed Query in \""+options.helperName+"\" template helper: \""+queryString +"\" .\nDetails: "+e.getMessage(), e);
        } catch (QueryEvaluationException e) {
            throw new RuntimeException("Error while evaluating query in \""+options.helperName+"\" template helper: "+queryString, e);
        }
    }

    public static String escapeIfRequested(String result, Options options) {
        return options.isFalsy(options.hash.getOrDefault(ESCAPE_RESULT_FLAG, "true"))
            ? result : StringEscapeUtils.escapeHtml4(result);
    }
}
