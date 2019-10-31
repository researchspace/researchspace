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

package com.metaphacts.junit;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.runner.RunWith;

/**
 * Base class for tests that require a backing repository. For now, the class
 * extends {@link AbstractIntegrationTest} by helper methods to e.g. conveniently
 * add statements to the repository.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(MetaphactsGuiceTestModule.class)
public abstract class AbstractRepositoryBackedIntegrationTest extends AbstractIntegrationTest {

    /**
     * Add a single statement to the repository.
     * 
     * @param stmt
     */
    final public void addStatement(final Statement stmt) throws Exception {
        try( RepositoryConnection con = repositoryRule.getRepository().getConnection()){
            con.add(stmt);
        }
    }

    final public void addStatements(final List<Statement> stmts) throws Exception  {
        try( RepositoryConnection con = repositoryRule.getRepository().getConnection()){
            con.add(stmts);
        } 
    }

    final public void addAssetStatements(Statement ...statements) throws Exception {
        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(Arrays.asList(statements));
        }
    }
}