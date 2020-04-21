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

package org.researchspace.dataquality.shacl.generators;

import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;

import com.google.common.collect.Sets;

class TestGenerator {

    protected Resource id;
    protected String query;
    protected String description;
    protected Set<IRI> patternIds = Sets.newHashSet();

    public TestGenerator() {
    }

    public void setId(Resource id) {
        this.id = id;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Resource getId() {
        return id;
    }

    public String getQuery() {
        return query;
    }

    public String getDescription() {
        return description;
    }

    public Set<IRI> getPatternIds() {
        return patternIds;
    }
}
