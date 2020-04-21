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
package org.researchspace.api.rest.client;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * Default implementation of {@link LDPAPIClient}.
 * 
 * @author msc
 */
public class RemoteLDPAPIClientImpl extends APIClientBaseImpl implements LDPAPIClient {

    public static final IRI LDP_CONTAINS = SimpleValueFactory.getInstance()
            .createIRI("http://www.w3.org/ns/ldp#contains");

    private IRI containerId;

    public RemoteLDPAPIClientImpl(final String endpoint, final String user, final String password,
            final IRI containerId, final IRI baseIri) {

        super(endpoint, user, password, baseIri);

        this.containerId = containerId;
    }

    public IRI getContainerId() {
        return containerId;
    }

    @Override
    public List<Resource> getContainedObjects() throws APICallFailedException {

        final String ldpRequest = ldpContainerContentRequestString(getContainerId().toString());

        final Model containedObjectsModel = getContainedObjectsModel(ldpRequest);

        final List<Resource> containedObjects = new LinkedList<Resource>();

        if (containedObjectsModel != null) {

            for (Value obj : containedObjectsModel.objects()) {

                if (obj instanceof IRI) {
                    containedObjects.add((IRI) obj);
                }

            }
        }

        return containedObjects;

    }

    @Override
    public Model getObjectModel(Resource object) throws APICallFailedException {

        if (!(object instanceof IRI)) {
            return null;
        }

        final String ldpRequest = ldpContainerContentRequestString(object.toString());

        return super.submitGET(ldpRequest);

    }

    public Model getContainedObjectsModel(final String pathFromEndpoint) throws APICallFailedException {

        // get the complete model
        final Model model = super.submitGET(pathFromEndpoint);

        // refine the model to the contained resources
        return model.filter(null, LDP_CONTAINS, null);

    }

    /**
     * Constructs an LDP request against the given iri (relative to, but not
     * including the endpoint).
     * 
     * @param iri
     * @return
     */
    private String ldpContainerContentRequestString(String iri) {

        final StringBuffer buf = new StringBuffer();
        buf.append("container?uri=");
        buf.append(iri.replace("#", "%23"));

        return buf.toString();
    }
}