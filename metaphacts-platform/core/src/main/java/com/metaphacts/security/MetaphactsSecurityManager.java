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

import java.util.Collection;

import javax.inject.Inject;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.cache.CacheManager;
import org.apache.shiro.cache.MemoryConstrainedCacheManager;
import org.apache.shiro.mgt.DefaultSecurityManager;
import org.apache.shiro.realm.CachingRealm;
import org.apache.shiro.realm.Realm;
import org.apache.shiro.web.mgt.DefaultWebSecurityManager;
import org.apache.shiro.web.session.mgt.DefaultWebSessionManager;

import com.metaphacts.config.Configuration;

/**
 * Platform specific security manager. Contains custom logics for Shiro realms,
 * caching, and session (timeout) management.
 *
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class MetaphactsSecurityManager extends DefaultWebSecurityManager {

    @Inject
    private ShiroTextRealm shiroTextRealm;

    public MetaphactsSecurityManager(Collection<Realm> realms, Configuration config) {
        super(realms);

        // Initialize a cache manager
        final CacheManager cacheManager = new MemoryConstrainedCacheManager();
        setCacheManager(cacheManager);

        // Initialize a session manager (using Shiro's internal default web session manager)
        final DefaultWebSessionManager sessionManager = new DefaultWebSessionManager();

        sessionManager.setGlobalSessionTimeout(config.getEnvironmentConfig().getShiroSessionTimeoutSecs() * 1000);

        /*
         *  Disable sessionIdUrlRewriting (appending ;JSESSIONID=).
         *  This fixes potential problems with access to path parameters and
         *  redirects (ID-278) as well as fixes a potential security risk.
         *
         *  According to OWASP exposing the SESSIONID e.g. through rewriting should be avoid anyway,
         *  since it bears a significant security risk ( https://www.owasp.org/index.php/Top_10_2007-A7).
         *
         *  Available with SHIRO 1.3.0:
         *  https://issues.apache.org/jira/browse/SHIRO-360
         *  https://issues.apache.org/jira/browse/SHIRO-361
         *  NOTE: if a user has disabled cookies, they will NOT be able to login if this is disable.
         */
        sessionManager.setSessionIdUrlRewritingEnabled(false);

        setSessionManager(sessionManager);

        for(Realm r : realms){
            if(CachingRealm.class.isAssignableFrom(r.getClass())){
                ((CachingRealm) r).setCacheManager(cacheManager);
            }
        }

    }

    /**
     * @return Instance of the {@link ShiroTextRealm}
     */
    public ShiroTextRealm getShiroTextRealm() throws IllegalStateException {
        return shiroTextRealm;
    }

   /**
    * @return Instance of the {@link LDAPRealm} if configured, <code>null</code> otherwise
    */
   public LDAPRealm getLDAPRealm(){
       DefaultSecurityManager manager = (DefaultSecurityManager) SecurityUtils.getSecurityManager();
       for(Realm realm : manager.getRealms()){
           if(realm instanceof LDAPRealm)
               return (LDAPRealm)realm;
       }
       return null;
   }
}
