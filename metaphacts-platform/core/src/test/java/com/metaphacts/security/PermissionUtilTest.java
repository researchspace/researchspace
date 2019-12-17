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

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.Permission;
import org.apache.shiro.config.Ini;
import org.apache.shiro.util.PermissionUtils;
import org.junit.Assert;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.metaphacts.api.sparql.SparqlUtil.SparqlOperation;
import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.repository.RepositoryManager;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PermissionUtilTest extends AbstractIntegrationTest {
    private final String sparqlPermissionShiroFile = "classpath:com/metaphacts/security/shiro-query-rights.ini";

    @Rule
    public ShiroRule shiroRule = new ShiroRule();
    
    @Inject
    public WildcardPermissionResolver wildcardPermissionResolver;
    
    @Test
    public void isPermissionTypeInvalidTest() {
        List<String> testPermissions = new ArrayList<String>();
        testPermissions.add("accou{nts:roles:query");
        testPermissions.add("pa=ges:view:<page_iri>|regex(<regex_expression>)");
        testPermissions.add("fo rms:ldp:delete");
        for(String permission : testPermissions) {
            Assert.assertFalse(PermissionUtil.isPermissionValid(permission));
        }
    }
    
    @Test
    public void isPermissionAfterTypeInvalidTest() {
        List<String> testPermissions = new ArrayList<String>();
        testPermissions.add("accounts:role{s:query");
        testPermissions.add("pages:view:<page_iri>|regex(<regex_ex}pression>)");
        testPermissions.add("forms:ldp:del{}ete");
        testPermissions.add("accounts:roles:qu\nery");
        for(String permission : testPermissions) {
            Assert.assertFalse(PermissionUtil.isPermissionValid(permission));
        }
    }
    
    @Test
    public void isPermissionValid() {
        List<String> testPermissions = new ArrayList<String>();
        testPermissions.add("accounts:roles:query");
        testPermissions.add("pages:view:<page_iri>|regex(<regex_expression>)");
        testPermissions.add("forms:ldp:delete");
        for(String permission : testPermissions) {
            Assert.assertTrue(PermissionUtil.isPermissionValid(permission));
        }
    }
    
    @Test
    public void normalizePermission() {
        String testPermission = "accounts:roles:      query";
        Assert.assertTrue(!PermissionUtil.normalizePermission(testPermission).contains(" "));
        Assert.assertEquals(PermissionUtil.normalizePermission(testPermission), "accounts:roles:query");
    }
    
    @Test
    @Ignore("Ignoring this case for now. This will work when we add a pass the sensitivity as true in"
            + "WildcardPermission(String wildcardString, boolean caseSensitive)")   
    public void permissionStringCaseSensitivityTest() {
        String testPermission = "acCouNts:RoLeS:QUeRY";
        Permission result = wildcardPermissionResolver.resolvePermission(testPermission);
        Assert.assertEquals(result.toString(), testPermission);
    }
    
    @Test
    public void validatePlatformDefaultPermissions() throws Exception {
        File file = new File("../../metaphacts-platform/app/config/shiro.ini");
        validatePermissions(file);
    }
    
    public static void validatePermissions(File file) throws Exception {
        try (InputStream stream = new FileInputStream(file)) {
            Ini ini = new Ini();
            ini.load(stream);
            Ini.Section rolesSection = ini.getSection("roles");
            for(String commaSeperatedPermissions : rolesSection.values()) {
                WildcardPermissionResolver permissionResolver = new WildcardPermissionResolver();
                for(Permission permission : PermissionUtils.resolveDelimitedPermissions(commaSeperatedPermissions, permissionResolver)) {
                    Assert.assertTrue("Permission in default shiro.ini should be valid", PermissionUtil.isPermissionValid(permission.toString()));
                }
            }
        }
    }
    
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