/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.ldp;

import org.eclipse.rdf4j.model.IRI;
import org.researchspace.data.rdf.container.DefaultLDPResource;
import org.researchspace.data.rdf.container.LDPR;
import org.researchspace.repository.MpRepositoryProvider;

/**
 * Specific LDP implementation for handling proposition sets as LDP resources
 * using a custom logic to generate the {@link IRI} for the NamedGraph in where
 * the propositions will be stored. This is required, since the beliefs need to
 * point to the identifier of the proposition set being the NamedGraph at the
 * same time.
 * 
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
@LDPR(iri = I4_Proposition_Set.IRI_STRING)
public class I4_Proposition_Set extends DefaultLDPResource {
    public static final String IRI_STRING = "http://www.ics.forth.gr/isl/CRMinf/I4_Proposition_Set";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public I4_Proposition_Set(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public IRI getContextIRI() {
        return this.getResourceIRI();
    }

}