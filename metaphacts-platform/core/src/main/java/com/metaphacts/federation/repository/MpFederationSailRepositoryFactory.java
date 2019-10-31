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

import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.StackableSail;
import org.eclipse.rdf4j.sail.config.DelegatingSailImplConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.eclipse.rdf4j.sail.config.SailRegistry;

/**
 * Custom {@link RepositoryFactory} implementation for 
 * {@link MpFederationSailRepository} instances.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpFederationSailRepositoryFactory implements RepositoryFactory {

    /**
     * The type of repositories that are created by this factory.
     * 
     * @see RepositoryFactory#getRepositoryType()
     */
    public static final String REPOSITORY_TYPE = "metaphacts:FederationSailRepository";

    /*---------*
     * Methods *
     *---------*/

    /**
     * Returns the repository's type: <tt>metaphacts:FederationSailRepository</tt>.
     */
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    public RepositoryImplConfig getConfig() {
        return new MpFederationSailRepositoryConfig();
    }

    public Repository getRepository(RepositoryImplConfig config) throws RepositoryConfigException {
        if (config instanceof MpFederationSailRepositoryConfig) {
            MpFederationSailRepositoryConfig sailRepConfig = (MpFederationSailRepositoryConfig) config;

            try {
                Sail sail = createSailStack(sailRepConfig.getSailImplConfig());
                return new MpFederationSailRepository((MpFederation) sail);
            } catch (SailConfigException e) {
                throw new RepositoryConfigException(e.getMessage(), e);
            }
        }

        throw new RepositoryConfigException("Invalid configuration class: " + config.getClass());
    }

    private Sail createSailStack(SailImplConfig config)
            throws RepositoryConfigException, SailConfigException {
        Sail sail = createSail(config);

        if (config instanceof DelegatingSailImplConfig) {
            SailImplConfig delegateConfig = ((DelegatingSailImplConfig) config).getDelegate();
            if (delegateConfig != null) {
                addDelegate(delegateConfig, sail);
            }
        }

        return sail;
    }

    private Sail createSail(SailImplConfig config)
            throws RepositoryConfigException, SailConfigException {
        SailFactory sailFactory = SailRegistry.getInstance().get(config.getType()).orElseThrow(
            () -> new RepositoryConfigException("Unsupported Sail type: " + config.getType()));
        return sailFactory.getSail(config);
    }

    private void addDelegate(SailImplConfig config, Sail sail)
            throws RepositoryConfigException, SailConfigException {
        Sail delegateSail = createSailStack(config);

        try {
            ((StackableSail) sail).setBaseSail(delegateSail);
        } catch (ClassCastException e) {
            throw new RepositoryConfigException(
                    "Delegate configured but " + sail.getClass() + " is not a StackableSail");
        }
    }
}