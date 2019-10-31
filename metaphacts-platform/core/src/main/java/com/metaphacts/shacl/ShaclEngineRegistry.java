/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.shacl;

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
