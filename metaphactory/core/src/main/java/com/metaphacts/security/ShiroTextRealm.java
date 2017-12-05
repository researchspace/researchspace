/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import com.google.common.base.Throwables;

import org.apache.commons.io.IOUtils;
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
        init();
    }

    
    private Configuration config;
    
    private boolean isConfigShiro = true;

    private Ini getIniFromConfig(Configuration config){
        Ini ini = null;
        try {
            ini = Ini.fromResourcePath(config.getEnvironmentConfig().getShiroConfig());
        } catch (Exception e) {
            isConfigShiro = false;
            logger.error("Not able to load shiro.ini from {}.", config.getEnvironmentConfig().getShiroConfig());
            logger.debug("Details: "+ e.getMessage());
            // prevent any further startup
            System.exit(1);
        }
        return ini;
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
    
    public void deleteAccount(String username){
        logger.trace("Deleting account with principal: "+username);
        if(!this.accountExists(username))
            throw new IllegalArgumentException("User with principal "+username + " does not exist.");
        
        this.users.remove(username);
        Ini ini = getIni();
        Ini.Section usersSection = ini.getSection(USERS_SECTION_NAME);
        usersSection.remove(username);
        
        saveIni(ini);
    }
    
    private void saveIni(Ini ini){
        logger.trace("Persisting changes to accounts. Saving changes to SHIRO text realm: "+config.getEnvironmentConfig().getShiroConfig());
        StringBuilder sb = new StringBuilder();
        for(Section s :ini.getSections()){
            sb.append("["+s.toString()+"]\n");
            for(Entry<String, String> entry : s.entrySet())
             sb.append(entry+"\n");
        }

        try (FileOutputStream fos = new FileOutputStream(new File(config.getEnvironmentConfig().getShiroConfig()))){
            java.nio.channels.FileLock lock = fos.getChannel().lock();
            try {
               IOUtils.write(sb.toString(), fos);
            } finally {
                lock.release();
            }
        } catch (IOException e) {
            Throwables.propagate(e);
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