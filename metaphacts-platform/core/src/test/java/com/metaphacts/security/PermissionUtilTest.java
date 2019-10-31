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

package com.metaphacts.security;

import org.apache.shiro.SecurityUtils;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.PermissionUtil;
import com.metaphacts.api.sparql.SparqlUtil.SparqlOperation;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PermissionUtilTest extends AbstractIntegrationTest {
    private final String sparqlPermissionShiroFile = "classpath:com/metaphacts/security/shiro-query-rights.ini";


    @Rule
    public ShiroRule shiroRule = new ShiroRule();
    
    @Test
    @SubjectAware(
            username="admin",
            password="admin",
            configuration = sparqlPermissionShiroFile
    )
    public void testAdmin() throws Exception {
        Assert.assertEquals("admin", SecurityUtils.getSubject().getPrincipal().toString());
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.ASSET_REPOSITORY_ID));
    }

    @Test
    @SubjectAware(
            username="guest",
            password="guest",
            configuration = sparqlPermissionShiroFile
            )
    public void testGuest() throws Exception {
        
        Assert.assertEquals("guest", SecurityUtils.getSubject().getPrincipal().toString());
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertTrue(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.ASSET_REPOSITORY_ID));
    }

    @Test
    @SubjectAware(
            configuration = sparqlPermissionShiroFile
            )
    public void testNonLoggedIn() throws Exception {
        
        Assert.assertEquals(null, SecurityUtils.getSubject().getPrincipal());
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.DEFAULT_REPOSITORY_ID));
        
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.SELECT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.ASK, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.CONSTRUCT, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.DESCRIBE, RepositoryManager.ASSET_REPOSITORY_ID));
        Assert.assertFalse(PermissionUtil.hasSparqlPermission(SparqlOperation.UPDATE, RepositoryManager.ASSET_REPOSITORY_ID));
    }

}