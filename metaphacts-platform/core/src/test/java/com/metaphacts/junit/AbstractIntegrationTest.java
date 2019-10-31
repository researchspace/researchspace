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

import static org.junit.Assert.assertEquals;

import org.jukito.JukitoRunner;
import org.jukito.UseModules;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.ReadConnection;

/**
 * Extend this class to automatically run your test with {@link JukitoRunner}
 * and {@link MetaphactsGuiceTestModule}, which will take care of basic
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
 * TODO It seems that there is an bug in the {@link JukitoRunner} if running
 * tests in parallel. Until this bug is fixed, it is important to execute tests
 * in sbt with the setting "parallelExecution in Test := false" See
 * https://metaphacts.atlassian.net/browse/ID-142
 * 
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
@RunWith(JukitoRunner.class)
@UseModules(MetaphactsGuiceTestModule.class)
public abstract class AbstractIntegrationTest {
    @Inject
    protected Provider<NamespaceRegistry> ns;
    
    @Inject
    protected Configuration config;

    @Inject
    @Rule
    public RepositoryRule repositoryRule;
    
    @Rule
    public ExpectedException exception= ExpectedException.none();

    /**
     * Dummy test method to prevent JukitoRunner from throwing an exception
     * because of none runnable test methods
     */
    @Test
    public void dummyTest(){
        // assert that triple store is empty
        assertEquals(0,repositoryRule.getReadConnection().size());
    }
    
    protected ReadConnection connection(){
       return this.repositoryRule.getReadConnection();
    }

}