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

package org.researchspace.services.fields;

import org.eclipse.rdf4j.model.IRI;

import java.util.Collection;

public class SearchRelation {
    public IRI id;
    public RelationKind kind;
    public String label;
    public Collection<IRI> domain;
    public Collection<IRI> range;
    public IRI xsdDatatype;
    public String queryPattern;
    public String rangePattern;
}
