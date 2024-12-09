/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.repository.sparql.qlever;

import org.researchspace.repository.sparql.CustomSPARQLRepository;

/**
 * Repository imlementation for QLever SPARQL endpoint.
 *
 * @see https://github.com/ad-freiburg/qlever
 * @see QLeverRepositoryConnection
 * @author Artem Kozlov
 * 
 * @deprecated QLever now supports ASK, so there is no need in custom repository
 */
public class QLeverRepository extends CustomSPARQLRepository {
    public QLeverRepository(String endpointUrl) {
        super(endpointUrl);
    }
}
