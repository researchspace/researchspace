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

import org.junit.Assert;
import org.junit.Test;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.OWL;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;

/**
 * Test to assert that the repository rule clears the repository before each
 * test method. This is important since the {@link ResearchSpaceGuiceTestModule}
 * only runs once per class and as such methods share some basic instances such
 * as the repository data folder.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class RepositoryRuleTest extends AbstractIntegrationTest {

    ValueFactory vf = SimpleValueFactory.getInstance();

    @Test
    public void testEmptyRepository1() throws RepositoryException {
        Assert.assertEquals(0, repositoryRule.getReadConnection().size());
        try (RepositoryConnection conn = repositoryRule.getRepository().getConnection()) {
            conn.add(vf.createStatement(FOAF.PERSON, RDF.TYPE, OWL.CLASS));
        }
    }

    @Test
    public void testEmptyRepository2() throws RepositoryException {
        Assert.assertEquals(0, repositoryRule.getReadConnection().size());
        try (RepositoryConnection conn = repositoryRule.getRepository().getConnection()) {
            conn.add(vf.createStatement(FOAF.PERSON, RDF.TYPE, OWL.CLASS));
        }
    }

}
