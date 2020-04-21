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

package org.researchspace.ldptest;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.container.AbstractLDPResource;
import org.researchspace.data.rdf.container.LDPR;
import org.researchspace.data.rdf.container.LDPResource;
import org.researchspace.repository.MpRepositoryProvider;

/**
 * This is a test implementation of a {@link LDPResource} being located in a
 * different package other than the default implementations.
 * 
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@LDPR(iri = LDPTestResource.iriString)
public class LDPTestResource extends AbstractLDPResource {
    public static final String iriString = "http://xmlns.com/foaf/0.1/Person";
    public static final IRI uri = vf.createIRI(iriString);

    public LDPTestResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    public Literal getPersonName() throws ModelException, RepositoryException {
        return Models.objectLiteral(this.getModel().filter(this.getResourceIRI(), FOAF.NAME, null)).get();
    }

}