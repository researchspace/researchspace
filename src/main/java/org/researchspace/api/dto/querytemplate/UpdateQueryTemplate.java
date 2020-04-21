package org.researchspace.api.dto.querytemplate;

import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.query.UpdateQuery;

public class UpdateQueryTemplate extends QueryTemplate<UpdateQuery> {

    private static final long serialVersionUID = -3339351277552886880L;

    public UpdateQueryTemplate(Resource id, String label, String description, UpdateQuery query) {
        super(id, label, description, query);
    }

}
