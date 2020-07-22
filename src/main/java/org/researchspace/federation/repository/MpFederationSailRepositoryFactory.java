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
    public static final String REPOSITORY_TYPE = "researchspace:FederationSailRepository";

    /*---------*
     * Methods *
     *---------*/

    /**
     * Returns the repository's type: <tt>researchspace:FederationSailRepository</tt>.
     */
    @Override
    public String getRepositoryType() {
        return REPOSITORY_TYPE;
    }

    @Override
    public RepositoryImplConfig getConfig() {
        return new MpFederationSailRepositoryConfig();
    }

    @Override
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

    private Sail createSailStack(SailImplConfig config) throws RepositoryConfigException, SailConfigException {
        Sail sail = createSail(config);

        if (config instanceof DelegatingSailImplConfig) {
            SailImplConfig delegateConfig = ((DelegatingSailImplConfig) config).getDelegate();
            if (delegateConfig != null) {
                addDelegate(delegateConfig, sail);
            }
        }

        return sail;
    }

    private Sail createSail(SailImplConfig config) throws RepositoryConfigException, SailConfigException {
        SailFactory sailFactory = SailRegistry.getInstance().get(config.getType())
                .orElseThrow(() -> new RepositoryConfigException("Unsupported Sail type: " + config.getType()));
        return sailFactory.getSail(config);
    }

    private void addDelegate(SailImplConfig config, Sail sail) throws RepositoryConfigException, SailConfigException {
        Sail delegateSail = createSailStack(config);

        try {
            ((StackableSail) sail).setBaseSail(delegateSail);
        } catch (ClassCastException e) {
            throw new RepositoryConfigException(
                    "Delegate configured but " + sail.getClass() + " is not a StackableSail");
        }
    }
}