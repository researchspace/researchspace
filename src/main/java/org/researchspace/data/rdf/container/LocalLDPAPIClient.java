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

package org.researchspace.data.rdf.container;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.LDPAPIClient;
import org.researchspace.vocabulary.LDP;

public class LocalLDPAPIClient implements LDPAPIClient {

    protected final LDPApiInternal ldpApi;
    protected final IRI containerId;

    public LocalLDPAPIClient(final LDPApiInternal ldpApi, final IRI containerId) {
        this.ldpApi = ldpApi;
        this.containerId = containerId;
    }

    public LocalLDPAPIClient(final LDPApiInternal ldpApi, final LDPContainer container) {
        this.ldpApi = ldpApi;
        this.containerId = container.getResourceIRI();
    }

    @Override
    public List<Resource> getContainedObjects() throws APICallFailedException {

        try {
            LDPResource ldpResource = ldpApi.getLDPResource(this.containerId);

            Model containedObjectsModel = ldpResource.getModel();

            final List<Resource> containedObjects = new LinkedList<Resource>();

            if (containedObjectsModel != null) {
                containedObjectsModel = containedObjectsModel.filter(null, LDP.contains, null);
                for (Value obj : containedObjectsModel.objects()) {

                    if (obj instanceof IRI) {
                        containedObjects.add((IRI) obj);
                    }

                }
            }

            return containedObjects;
        } catch (Exception e) {
            throw new APICallFailedException("LDP API call failed: ", e);
        }
    }

    @Override
    public Model getObjectModel(Resource object) throws APICallFailedException {
        if (!(object instanceof Resource)) {
            throw new APICallFailedException(object.stringValue() + " must be an IRI");
        }

        try {
            LDPResource ldpResource = ldpApi.getLDPResource((IRI) object);
            return ldpResource.getModel();
        } catch (Exception e) {
            throw new APICallFailedException("LDP API call failed: ", e);
        }
    }
}
