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

package org.researchspace.sail.virtuoso;

import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.researchspace.repository.RepositoryManager;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.Singleton;

/**
 * {@link SailFactory} implementation to create
 * {@link VirtuosoKeywordSearchSail} instances.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
@Singleton
@Deprecated
public class VirtuosoKeywordSearchSailFactory implements SailFactory {

    public static final String SAIL_TYPE = "researchspace:VirtuosoKeywordSail";

    @Inject
    static Provider<RepositoryManager> repositoryManagerProvider;

    public VirtuosoKeywordSearchSailFactory() {

    }

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new VirtuosoKeywordSearchSailImplConfig();
    }

    @Override
    public VirtuosoKeywordSearchSail getSail(SailImplConfig config) throws SailConfigException {
        if (!(config instanceof VirtuosoKeywordSearchSailImplConfig)) {
            throw new SailConfigException("Wrong config type: " + config.getClass().getCanonicalName() + ". ");
        }
        VirtuosoKeywordSearchSail res = new VirtuosoKeywordSearchSail(
                ((VirtuosoKeywordSearchSailImplConfig) config).getDelegateRepositoryId());
        return res;
    }

}