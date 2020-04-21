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

import static org.researchspace.api.transform.ModelUtils.getNotNullObjectLiteral;
import static org.researchspace.api.transform.ModelUtils.getNotNullSubjectIRI;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.api.dto.query.Query;
import org.researchspace.api.dto.query.SelectQuery;
import org.researchspace.api.transform.ModelToQueryTransformer;

public class ModelToQueryTest extends BaseModelToDtoTest {

    @Test
    public void testModelToQuery() throws Exception {

        Model m = readTurtleInputStreamIntoModel(FILE_SPIN_QUERY_TTL, vf.createIRI("http://www.test.de"));
        IRI queryIRI = getNotNullSubjectIRI(m, RDF.TYPE, SP.QUERY_CLASS);
        Query<?> query = new ModelToQueryTransformer().modelToDto(m);
        Assert.assertTrue(query instanceof SelectQuery);
        Assert.assertEquals(queryIRI, query.getId());
        Assert.assertEquals(getNotNullObjectLiteral(m, queryIRI, SP.TEXT_PROPERTY).stringValue(),
                query.getQueryString());
        Assert.assertEquals(getNotNullObjectLiteral(m, queryIRI, RDFS.LABEL).stringValue(), query.getLabel());
    }

}