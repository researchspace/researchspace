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

package org.researchspace.templates.helper;

import static com.google.common.base.Preconditions.checkNotNull;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.api.sparql.SparqlOperationBuilder;
import org.researchspace.templates.TemplateContext;

import com.github.jknack.handlebars.Options;
import com.github.jknack.handlebars.helper.IfHelper;

/**
 * Handlebars helper to execute SPARQL ASK queries. Helper will return either
 * "true" or an empty string (for false). The reason is that the
 * {@link AskHelper} helper is primarily to be used as subexpression in
 * {@link IfHelper}, which has special logic for comparing different primitive
 * types. However, since helper functions can only return {@link CharSequence}
 * we need to return an empty string for false. <br>
 * <strong>Subexpression Example:</strong> <br>
 * <code>
 * [[#if (ask "ASK {?a ?b ?c}) ]]
 *  true branch
 * [[else]]
 *  false branch
 * [[/if]]
 * </code><br>
 * <strong>Stand-alone</strong><br>
 * <code>
 * Is this true ?: [[#ask "ASK {?a ?b ?c} ]]
 * </code>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class AskHelperSource {

    private static final Logger logger = LogManager.getLogger(AskHelperSource.class);

    public String ask(String param0, Options options) {
        TemplateContext context = (TemplateContext) options.context.model();
        String queryString = checkNotNull(param0);
        try (RepositoryConnection con = context.getRepository().getConnection()) {
            SparqlOperationBuilder<BooleanQuery> tqb = HelperUtil.contextualizeSparqlOperation(
                    SparqlOperationBuilder.<BooleanQuery>create(queryString, BooleanQuery.class), context);
            context.getNamespaceRegistry().map(ns -> tqb.setNamespaces(ns.getPrefixMap()));
            BooleanQuery op = tqb.build(con);
            if (!(op instanceof BooleanQuery))
                throw new IllegalArgumentException("Only SPARQL ASK queries are not supported in SPARQL "
                        + options.helperName + " Template Helper Function.");

            logger.trace(
                    "Evaluating SPARQL ASK query in SPARQL " + options.helperName + " Template Helper: " + queryString);
            boolean b = op.evaluate();
            return b ? "true" : ""; // handlebars requires empty string for
                                    // false, if not native boolean
        } catch (RepositoryException e) {
            throw new RuntimeException("Repository Exception while evaluating query in SPARQL " + options.helperName
                    + " Template Helper: " + queryString, e);
        } catch (MalformedQueryException e) {
            throw new IllegalArgumentException("Malformed Query in SPARQL " + options.helperName
                    + "  Template Helper: \"" + queryString + "\" .\nDetails: " + e.getMessage(), e);
        } catch (QueryEvaluationException e) {
            throw new RuntimeException(
                    "Error while evaluating query in SPARQL " + options.helperName + " Template Helper: " + queryString,
                    e);
        }
    }
}