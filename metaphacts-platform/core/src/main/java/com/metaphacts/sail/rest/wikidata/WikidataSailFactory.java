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

package com.metaphacts.sail.rest.wikidata;

import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import com.google.inject.Inject;
import com.metaphacts.federation.repository.MpSparqlServiceRegistry;
import com.metaphacts.federation.repository.service.ServiceDescriptor;


/**
 * {@link SailFactory} implementation for {@WikidataSail}
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class WikidataSailFactory implements SailFactory {
    
    public static final String SAIL_TYPE = "metaphacts:WikidataTextSearch";
    
    public WikidataSailFactory() {
        // TODO Auto-generated constructor stub
    }

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new WikidataSailConfig();
    }

    @Override
    public Sail getSail(SailImplConfig originalConfig) throws SailConfigException {
        if (!(originalConfig instanceof WikidataSailConfig)) {
            throw new SailConfigException(
                    "Wrong config type: " 
                            + originalConfig.getClass().getCanonicalName() + ". ");
        }
        WikidataSailConfig config = (WikidataSailConfig)originalConfig;
        
        WikidataSail sail = new WikidataSail(config.getUrl());
        sail.setServiceID(config.getServiceID());
        return sail;
        
    }

}