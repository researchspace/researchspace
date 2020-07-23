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

import java.util.Arrays;
import java.util.List;

import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.runner.RunWith;

/**
 * Base class for tests that require a backing repository. For now, the class
 * extends {@link AbstractIntegrationTest} by helper methods to e.g.
 * conveniently add statements to the repository.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public abstract class AbstractRepositoryBackedIntegrationTest extends AbstractIntegrationTest {

    /**
     * Add a single statement to the repository.
     * 
     * @param stmt
     */
    final public void addStatement(final Statement stmt) throws Exception {
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(stmt);
        }
    }

    final public void addStatements(final List<Statement> stmts) throws Exception {
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(stmts);
        }
    }

    final public void addAssetStatements(Statement... statements) throws Exception {
        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(Arrays.asList(statements));
        }
    }
}
