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

package com.metaphacts.sail.rest.graphscope;

import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;

public class GraphScopeLookupSailFactory implements SailFactory {
    
    public static final String SAIL_TYPE = "metaphacts:GraphScopeLookup";

    public GraphScopeLookupSailFactory() {
    }

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new GraphScopeLookupSailConfig();
    }

    @Override
    public Sail getSail(SailImplConfig originalConfig) throws SailConfigException {
        if (!(originalConfig instanceof GraphScopeLookupSailConfig)) {
            throw new SailConfigException(
                    "Wrong config type: " 
                            + originalConfig.getClass().getCanonicalName() + ". ");
        }
        GraphScopeLookupSailConfig config = (GraphScopeLookupSailConfig)originalConfig;
        
        GraphScopeLookupSail sail = new GraphScopeLookupSail(config.getUrl());
        sail.setServiceID(config.getServiceID());
        return sail;
    }

}
