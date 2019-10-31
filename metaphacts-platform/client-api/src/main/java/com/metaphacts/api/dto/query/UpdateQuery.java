package com.metaphacts.api.dto.query;

import java.util.Map;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.ParsedUpdate;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;

public class UpdateQuery extends Query<ParsedUpdate> {

    private static final long serialVersionUID = 8232450072005431562L;

    public UpdateQuery(Resource id, String label, String description, String queryString) {
        super(id, label, description, queryString);
    }

    public UpdateQuery(final Resource id, final String label, final String description,
            final String queryString, Map<String, String> standardPrefixes) {
        super(id, label, description, queryString, standardPrefixes);
    }

    @Override
    protected ParsedUpdate getQueryInternal() throws MalformedQueryException, ClassCastException {
        SPARQLParser parser = new SPARQLParser();
        return parser.parseUpdate(prependPrefixes(), BASE_IRI_STR);
    }

}
