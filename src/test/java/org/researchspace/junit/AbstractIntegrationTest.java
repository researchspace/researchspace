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

package org.researchspace.junit;

import static org.junit.Assert.assertEquals;

import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.ReadConnection;

import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * Extend this class to automatically run your test with {@link JukitoRunner}
 * and {@link ResearchSpaceGuiceTestModule}, which will take care of basic
 * configurations (i.e. in temporary folders) as well as binding classes for
 * dynamic and static guice injections.
 *
 * <p>
 * <b>Please note</b> that the runner executes the module only once per class.
 * Consequently test methods access the same configuration and data files and as
 * such custom {@link Rule}s must ensure to reset or reinitialize, for example,
 * the repository or namespaces.
 * 
 * </p>
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public abstract class AbstractIntegrationTest {
    @Inject
    protected Provider<NamespaceRegistry> ns;

    @Inject
    protected Configuration config;

    @Inject
    @Rule
    public RepositoryRule repositoryRule;

    @Rule
    public ExpectedException exception = ExpectedException.none();

    /**
     * Dummy test method to prevent JukitoRunner from throwing an exception because
     * of none runnable test methods
     */
    @Test
    public void dummyTest() {
        // assert that triple store is empty
        assertEquals(0, repositoryRule.getReadConnection().size());
    }

    protected ReadConnection connection() {
        return this.repositoryRule.getReadConnection();
    }

}
