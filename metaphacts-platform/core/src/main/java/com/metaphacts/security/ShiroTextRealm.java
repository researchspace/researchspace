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

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authc.SimpleAccount;
import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authz.Permission;
import org.apache.shiro.authz.SimpleRole;
import org.apache.shiro.config.Ini;
import org.apache.shiro.config.Ini.Section;
import org.apache.shiro.realm.text.IniRealm;
import org.apache.shiro.subject.SimplePrincipalCollection;
import org.apache.shiro.util.PermissionUtils;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.google.inject.Inject;
import com.metaphacts.config.Configuration;



/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class ShiroTextRealm extends IniRealm {

    private static final Logger logger = LogManager.getLogger(ShiroTextRealm.class);
    
    @Inject
    public ShiroTextRealm(Configuration config,CredentialsMatcher passwordMatcher) {
        super();
        this.config=config;
        setIni(getIniFromConfig(config));
        setCredentialsMatcher(passwordMatcher);
        setPermissionResolver(new WildcardPermissionResolver());
        init();
    }

    /**
     * Constructor for testing purpose only to not require environment
     * 
     * @param passwordMatcher
     */
    /* packager */ ShiroTextRealm(Ini ini, CredentialsMatcher passwordMatcher) {
        super();
        setIni(ini);
        setCredentialsMatcher(passwordMatcher);
        setPermissionResolver(new WildcardPermissionResolver());
        init();
    }

    
    private Configuration config;
    
    private boolean isConfigShiro = true;

    private Ini getIniFromConfig(Configuration config) {
        SecurityConfigRecord record = config.getEnvironmentConfig()
            .getSecurityConfig(SecurityConfigType.ShiroConfig);

        try (InputStream stream = record.readStream()) {
            Ini ini = new Ini();
            ini.load(stream);
            return ini;
        } catch (Exception e) {
            isConfigShiro = false;
            logger.error("Not able to load {} from {}",
                record.getType().getFileName(), record.getLocationDescription());
            logger.debug("Details: "+ e.getMessage(), e);
            // prevent any further startup
            System.exit(1);
        }
        return null;
    }
    
    public Map<String, SimpleAccount> getUsers(){
        return this.users;
    }
    
    public Map<String, SimpleRole> getRoles(){
        return this.roles;
    }
    
    @Override
    public void addAccount(String username, String password, String... roles) {
        if(isConfigShiro==false)
            throw new IllegalStateException("");
        
        List<String> suppliedRoles = (roles==null) ? Lists.<String>newArrayList()  : Lists.<String>newArrayList(roles); 
        for(String r : suppliedRoles){
            if(!this.getRoles().containsKey(r))
                throw new IllegalArgumentException("Role "+ r +" does not exist.");
        }
        
        super.addAccount(username, password, roles);
        
      //set permission otherwise restart is required
        Set<Permission> permissions = Sets.newHashSet();
        for(String r : suppliedRoles){
            permissions.addAll(this.getRole(r).getPermissions());
        }
        getUser(username).setObjectPermissions(permissions);
        
        SimplePrincipalCollection principals = new SimplePrincipalCollection();
        principals.add("username", this.getName());
        clearCachedAuthorizationInfo(principals);
        Ini ini = getIni();
        Ini.Section usersSection = ini.getSection(USERS_SECTION_NAME);
        usersSection.put(username, password+","+StringUtils.join(roles, ","));
        saveIni(ini);
        
    }
    
    @Override
    public void addAccount(String username, String password) {
        this.addAccount(username, password, new String[]{});
    }
    
    public void addRole(String roleName, Set<Permission> permissionsSet) {
        add(new SimpleRole(roleName, permissionsSet));
    }

    public void updateRoles(Map<String, List<String>> updateRolesMap) {
        Ini ini = getIni();
        logger.info("Updating roles by user : " + SecurityService.getUserName());
        Ini.Section rolesSection = ini.getSection(ROLES_SECTION_NAME);
        ROLES_LOCK.writeLock().lock();
        try {
            for (Map.Entry<String, List<String>> entry : updateRolesMap.entrySet()) {
                Set<Permission> permissions = PermissionUtils.resolvePermissions(entry.getValue(), getPermissionResolver());
                rolesSection.put(entry.getKey(), StringUtils.join(permissions, ", "));
                addRole(entry.getKey(), permissions);
            }
            HashSet<String> unionKeys = new HashSet<>();
            unionKeys.addAll(getRoles().keySet()); // Actual role names
            unionKeys.removeAll(updateRolesMap.keySet());
            for (String roleNameToDelete : unionKeys) {
                logger.info("Deleting role : " + roleNameToDelete);
                rolesSection.remove(roleNameToDelete);
                this.roles.remove(roleNameToDelete); // Removing from the in-memory stores
            }
        } finally {
            ROLES_LOCK.writeLock().unlock();
        }

        saveIni(ini);
    }
    
    public void deleteAccount(String username){
        logger.trace("Deleting account with principal: "+username);
        if(!this.accountExists(username))
            throw new IllegalArgumentException("User with principal "+username + " does not exist.");
        USERS_LOCK.writeLock().lock();
        try {
        	this.users.remove(username);
        } finally {
            USERS_LOCK.writeLock().unlock();
        }
        
        Ini ini = getIni();
        Ini.Section usersSection = ini.getSection(USERS_SECTION_NAME);
        usersSection.remove(username);
        
        saveIni(ini);
    }
    
    private void saveIni(Ini ini) {
        SecurityConfigRecord record = config.getEnvironmentConfig()
            .getSecurityConfig(SecurityConfigType.ShiroConfig);
        logger.trace("Persisting changes to accounts. Saving changes to SHIRO text realm: " + record.getLocationDescription());

        StringBuilder sb = new StringBuilder();
        for(Section s :ini.getSections()){
            sb.append("["+s.toString()+"]\n");
            for(Entry<String, String> entry : s.entrySet())
             sb.append(entry+"\n");
        }

        try {
            record.writeAll(sb.toString());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void updateAccount(String principal, String encryptPassword, String[] roles) {
        logger.trace("Updating account with principal: "+principal);
        if(!this.accountExists(principal))
            throw new IllegalArgumentException("User with principal "+principal + " does not exist.");
        if(encryptPassword==null)
            encryptPassword=this.getUser(principal).getCredentials().toString();

        this.addAccount(principal, encryptPassword, roles);
    }
    
}
