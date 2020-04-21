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

package org.researchspace.dataquality;

import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.LDPAPIClient;

/**
 * An implementation of a pseudo-LDP API client operating on top of an in-memory
 * {@link Model}. Assumed to contain all instances in the model that have an
 * explicit rdf:type.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class ModelBasedLdpApiClientImpl implements LDPAPIClient {

    protected final Model parentModel;

    public ModelBasedLdpApiClientImpl(Model parentModel) {
        this.parentModel = parentModel;
    }

    @Override
    public List<Resource> getContainedObjects() throws APICallFailedException {
        return parentModel.filter(null, RDF.TYPE, null).stream().map(stmt -> stmt.getSubject())
                .collect(Collectors.toList());
    }

    @Override
    public Model getObjectModel(Resource object) throws APICallFailedException {
        return ShaclUtils.extractSubTreeBySubject(parentModel, object);
    }

}
