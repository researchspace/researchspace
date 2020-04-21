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

package org.researchspace.shacl;

import org.eclipse.rdf4j.common.lang.service.ServiceRegistry;

public class ShaclEngineRegistry extends ServiceRegistry<String, ShaclEngineFactory> {

    private static class ShaclEngineRegistryHolder {
        public static final ShaclEngineRegistry instance = new ShaclEngineRegistry();
    }

    public static ShaclEngineRegistry getInstance() {
        return ShaclEngineRegistryHolder.instance;
    }

    protected ShaclEngineRegistry() {
        super(ShaclEngineFactory.class);
    }

    @Override
    protected String getKey(ShaclEngineFactory service) {
        return service.getEngineType();
    }
}
