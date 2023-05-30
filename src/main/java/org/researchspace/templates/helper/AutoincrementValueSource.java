/**
 * ResearchSpace
 * Copyright (C) 2023, MPIWG
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

import java.io.IOException;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.util.Values;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Operation;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sparql.query.SPARQLUpdate;
import org.researchspace.api.sparql.SparqlOperationBuilder;
import org.researchspace.templates.TemplateContext;

import com.github.jknack.handlebars.Options;

/**
 * Template helper that increments the value of the given IRI in the repository
 * and returns the resulting value.
 * 
 * The optional parameter "initial" (default 1000000) is used as a starting value 
 * if none exists.
 * 
 * <code>
 * [[autoincrementValue "myns:mycounter"]]
 * </code><br>
 * 
 * @author Robert Casties <casties@mpiwg-berlin.mpg.de>, Johannes Trame <jt@metaphacts.com>
 *
 */
public class AutoincrementValueSource {

    private static final Logger logger = LogManager.getLogger(AutoincrementValueSource.class);

    public String autoincrementValue(String param0, Options options) throws IOException {
        TemplateContext context = (TemplateContext) options.context.model();
        String idString = checkNotNull(param0, "Autoincrement identifier must not be null.");
        Value idValue;
        String[] idParts = idString.split(":", 2);
        if (idParts[0].startsWith("http")) {
            // full URI
            idValue = Values.iri(idString);
        } else {
            // try as namespace prefix
            String pref = context.getNamespaceRegistry()
                .flatMap(ns -> ns.getNamespace(idParts[0]))
                .orElse(idParts[0]); 
            idValue = Values.iri(pref, idParts[1]);
        }
        Value initialValue = Values.literal(Integer.parseInt(options.hash("initial", "1000000")));
        String updateString = "DELETE { ?id rdfs:label ?last . }\n"
                + "INSERT { ?id rdfs:label ?new . }\n"
                + "WHERE {{\n"
                + "  SELECT (max(?last_or_new) as ?last) WHERE {\n"
                + "    OPTIONAL { ?id rdfs:label ?db_last . }\n"
                + "    bind(if(bound(?db_last), ?db_last, ?initial) as ?last_or_new)\n"
                + "  }}\n"
                + "  bind(?last + 1 as ?new)\n"
                + "}";
        String queryString = "SELECT (max(?cnt) as ?last) WHERE { ?id rdfs:label ?cnt . }";

        try (RepositoryConnection con = context.getRepository().getConnection()) {
            SparqlOperationBuilder<Operation> uob = HelperUtil
                    .contextualizeSparqlOperation(SparqlOperationBuilder.create(updateString), context);
            context.getNamespaceRegistry().map(ns -> uob.setNamespaces(ns.getPrefixMap()));
            SPARQLUpdate uop = (SPARQLUpdate) uob.build(con);
            uop.setBinding("id", idValue);
            uop.setBinding("initial", initialValue);
            logger.trace("Evaluating SPARQL UPDATE in {} Template Helper: {}", options.helperName, updateString);
            uop.execute();
            
            SparqlOperationBuilder<Operation> qob = HelperUtil
                    .contextualizeSparqlOperation(SparqlOperationBuilder.create(queryString), context);
            context.getNamespaceRegistry().map(ns -> qob.setNamespaces(ns.getPrefixMap()));
            Operation qop = qob.build(con);
            qop.setBinding("id", idValue);
            logger.trace("Evaluating SPARQL SELECT in {} Template Helper: {}", options.helperName, queryString);
            try (TupleQueryResult tqr = ((TupleQuery) qop).evaluate();) {
                // workaround, we need to iterate over the result entirely otherwise sesame will
                // throw exception
                String stringValue = null;
                while (tqr.hasNext()) {
                    BindingSet b = tqr.next();
                    Value v = b.getValue("last");
                    if (v != null && stringValue == null) {
                        stringValue = v.stringValue();
                    }

                }
                return stringValue != null ? stringValue : "";
            }
        } catch (RepositoryException e) {
            throw new RuntimeException("Repository Exception while evaluating query in \"" + options.helperName
                    + "\" template helper: " + queryString, e);
        } catch (MalformedQueryException e) {
            throw new IllegalArgumentException(
                    "Malformed Query in \"" + options.helperName + "\" template helper: " + queryString, e);
        } catch (QueryEvaluationException e) {
            throw new RuntimeException(
                    "Error while evaluating query in \"" + options.helperName + "\" template helper: " + queryString, e);
        }
    }
}