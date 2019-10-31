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

package com.metaphacts.data.rdf.container;

import org.junit.Before;
import org.junit.Rule;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.github.sdorra.shiro.ShiroRule;
import com.google.inject.Inject;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.junit.NamespaceRule;
import com.metaphacts.junit.RepositoryRule;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.MpRepositoryProvider;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public abstract class AbstractLDPTest extends AbstractIntegrationTest {
    //TEST FILES
    protected static String FILE_DUMMY_CONTAINER_TTL = "/com/metaphacts/data/rdf/container/dummyContainer.ttl";
    protected static String FILE_DUMMY_RESOURCE_TTL = "/com/metaphacts/data/rdf/container/dummyResource.ttl";
    
    protected static ValueFactory vf = SimpleValueFactory.getInstance();

    protected LDPApiInternal api; 
    
    protected final String sparqlPermissionShiroFile = "classpath:com/metaphacts/security/shiro-query-rights.ini";

    @Rule // required to initialize the security manager
    public ShiroRule shiroRule = new ShiroRule();
    
    @Inject
    @Rule
    public NamespaceRule namespaceRule;
    
    @Before
    public void setup() {
        this.api = new LDPApiInternal(
                new MpRepositoryProvider(this.repositoryRule.getRepositoryManager(),
                        RepositoryManager.DEFAULT_REPOSITORY_ID),
                namespaceRule.getNamespaceRegistry());
        //this is required since the LDPApi needs access to the user manager to get user URI for provenance
        //ns.get().set("User","http://www.test.de/usernamespace/");
    }
}