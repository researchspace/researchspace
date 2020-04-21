/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.transform;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import org.apache.commons.lang3.NotImplementedException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.api.dto.query.AskQuery;
import org.researchspace.api.dto.query.ConstructQuery;
import org.researchspace.api.dto.query.DescribeQuery;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.query.SelectQuery;
import org.researchspace.api.dto.query.UpdateQuery;

/**
 * Transformation from {@link Model} to {@link Query} and back.
 * 
 * @author msc
 */
public class ModelToQueryTransformer implements ModelToDtoTransformer<Query<?>> {

    protected Map<String, String> standardPrefixes = new HashMap<>();

    public ModelToQueryTransformer() {

    }

    public ModelToQueryTransformer(Map<String, String> standardPrefixes) {
        this.standardPrefixes = standardPrefixes;
    }

    @Override
    public Query<?> modelToDto(final Model model) throws InvalidQueryModelException {

        if (model == null) {
            return null;
        }

        final Iterator<Statement> modelIterator = model.iterator();

        /**
         * This is a naive implementation for now, but at the time being we don't expect
         * any performance problems here.
         */
        IRI queryId = null;
        IRI queryType = null;
        String label = null;
        String description = null;
        String queryString = null;
        while (modelIterator.hasNext()) {

            final Statement stmt = modelIterator.next();
            final IRI predicate = stmt.getPredicate();
            final Value object = stmt.getObject();

            if (predicate.equals(RDF.TYPE)) {

                // TODO: proper handling of ill-typed schema, for
                // now let's keep it simple and just report the last
                // found type (in case this is the query type)
                if (object.equals(SP.SELECT_CLASS) || object.equals(SP.ASK_CLASS) || object.equals(SP.CONSTRUCT_CLASS)
                        || object.equals(SP.DESCRIBE_CLASS) || object.equals(SP.UPDATE_CLASS)) {

                    queryId = (IRI) stmt.getSubject();
                    queryType = (IRI) object;
                }

            } else if (predicate.equals(RDFS.LABEL)) {

                label = object.stringValue();

            } else if (predicate.equals(RDFS.COMMENT)) {

                description = object.stringValue();

            } else if (predicate.equals(SP.TEXT_PROPERTY)) {

                queryString = object.stringValue();

            }

        }

        // sanity checks
        if (queryId == null) {
            throw new InvalidQueryModelException("No query id set in model.", null /* cause */);
        }

        if (queryType == null) {
            throw new InvalidQueryModelException("No query type specified in model for query " + queryId,
                    null /* cause */);
        }

        if (queryString == null) {
            throw new InvalidQueryModelException("No query string specified in model for query " + queryId,
                    null /* cause */);
        }

        // construct DTOs
        Query<?> ret = null;
        if (queryType.equals(SP.SELECT_CLASS)) {

            ret = new SelectQuery(queryId, label, description, queryString, standardPrefixes);

        } else if (queryType.equals(SP.ASK_CLASS)) {

            ret = new AskQuery(queryId, label, description, queryString, standardPrefixes);

        } else if (queryType.equals(SP.CONSTRUCT_CLASS)) {

            ret = new ConstructQuery(queryId, label, description, queryString, standardPrefixes);

        } else if (queryType.equals(SP.DESCRIBE_CLASS)) {

            ret = new DescribeQuery(queryId, label, description, queryString, standardPrefixes);

        } else if (queryType.equals(SP.UPDATE_CLASS)) {

            ret = new UpdateQuery(queryId, label, description, queryString, standardPrefixes);
        }

        if (ret == null)
            return null; // fallback

        try {
            ret.assertConsistency();
        } catch (InconsistentDtoException e) {
            throw new InvalidQueryModelException("Dto for model of " + queryId + " is inconsistent", e);
        }

        return ret;
    }

    @Override
    public Model dtoToModel(final Query<?> dto) {
        throw new NotImplementedException(Query.class.getName() + " dtoToModel() is not yet implemented.");
    }

}