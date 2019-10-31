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

package com.metaphacts.federation.repository;

import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;

/**
 * {@link SailFactory} implementation for {@link MpFederation}
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpFederationFactory implements SailFactory {

    public static final String SAIL_TYPE = "metaphacts:Federation";

    public MpFederationFactory() {

    }

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new MpFederationConfig();
    }

    @Override
    public MpFederation getSail(SailImplConfig originalConfig) throws SailConfigException {
        if (!(originalConfig instanceof MpFederationConfig)) {
            throw new SailConfigException(
                    "Wrong config type: " + originalConfig.getClass().getCanonicalName() + ". ");
        }
        MpFederationConfig config = (MpFederationConfig) originalConfig;
        MpFederation result = new MpFederation(config.getDefaultMember(), config.getRepositoryIDMappings());
        result.setUseAsyncParallelJoin(config.isUseAsyncParallelJoin());
        result.setUseBoundJoin(config.isUseBoundJoin());
        result.setUseCompetingJoin(config.isUseCompetingJoin());
        result.setEnableQueryHints(config.isEnableQueryHints());
        return result;
    }

}