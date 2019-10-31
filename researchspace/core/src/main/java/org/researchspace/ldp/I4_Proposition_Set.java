/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package org.researchspace.ldp;

import org.eclipse.rdf4j.model.IRI;
import com.metaphacts.data.rdf.container.DefaultLDPResource;
import com.metaphacts.data.rdf.container.LDPR;
import com.metaphacts.repository.MpRepositoryProvider;

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