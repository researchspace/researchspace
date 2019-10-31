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

import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.config.Ini;
import org.apache.shiro.realm.Realm;
import org.apache.shiro.realm.ldap.JndiLdapRealm;
import org.apache.shiro.web.config.WebIniSecurityManagerFactory;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.metaphacts.config.Configuration;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class LDAPRealmProvider implements Provider<Realm> {

    private static final Logger logger = LogManager.getLogger(LDAPRealmProvider.class);

    @Inject
    private Configuration config;

    @Override
    public Realm get() {
           SecurityConfigRecord record = config.getEnvironmentConfig()
               .getSecurityConfig(SecurityConfigType.ShiroLDAPConfig);

           Ini ini = SecurityConfigRecord.readIni(record);
           logger.info("Trying to initialize SHIRO LDAP realm from: " + record.getLocationDescription());

           WebIniSecurityManagerFactory factory = new WebIniSecurityManagerFactory(ini);
           //need to call getInstance before getting the beans
           factory.getInstance();
           Map<String, ?> beans = factory.getBeans();
           Object r = beans.get("ldapRealm");
           if(r==null || !JndiLdapRealm.class.isAssignableFrom(r.getClass()))
               throw new IllegalArgumentException(
                   "Invalid JndiLdapRealm specified in " + record.getLocationDescription());
           
           return (JndiLdapRealm)r;
    }
    

}
