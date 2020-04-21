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

package org.researchspace.federation.repository;

import org.eclipse.rdf4j.repository.sail.config.SailRepositoryConfig;

/**
 * {@SailRepositoryConfig} implementation for
 * {@link MpFederationSailRepository}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationSailRepositoryConfig extends SailRepositoryConfig {

    public MpFederationSailRepositoryConfig() {
        setType(MpFederationSailRepositoryFactory.REPOSITORY_TYPE);
    }

    public MpFederationSailRepositoryConfig(MpFederationConfig sailImplConfig) {
        super(sailImplConfig);
        setType(MpFederationSailRepositoryFactory.REPOSITORY_TYPE);
    }
}