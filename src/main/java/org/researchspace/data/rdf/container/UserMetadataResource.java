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

import org.eclipse.rdf4j.model.IRI;
import org.researchspace.repository.MpRepositoryProvider;

/**
 * @author Denis Ostapenko
 */
@LDPR(iri = UserMetadataResource.URI_STRING)
public class UserMetadataResource extends AbstractLDPResource {
    public static final String URI_STRING = "http://www.researchspace.org/resource/system/userMetadataType";
    public static final IRI URI = vf.createIRI(URI_STRING);
    public static final String HAS_USER_STRING = "http://www.researchspace.org/resource/system/hasUser";
    public static final IRI HAS_USER = vf.createIRI(HAS_USER_STRING);

    public UserMetadataResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }
}
