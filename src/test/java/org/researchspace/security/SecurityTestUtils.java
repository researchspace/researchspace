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

package org.researchspace.security;

import java.util.Collection;
import java.util.Collections;

import javax.inject.Inject;

import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.DefaultPasswordService;
import org.apache.shiro.authc.credential.SimpleCredentialsMatcher;
import org.apache.shiro.config.Ini;
import org.apache.shiro.realm.Realm;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.junit.ResearchSpaceShiroRule;
import org.researchspace.security.PlatformSecurityManager;
import org.researchspace.security.ShiroTextRealm;

public class SecurityTestUtils {

    @Inject
    public CacheManager cacheService;

    /**
     * Create an isolated {@link PlatformSecurityManager} for testing purposes. See
     * {@link ResearchSpaceShiroRule} for usage.
     * 
     * @param iniResourcePath
     * @param config
     * @return
     */
    public static PlatformSecurityManager createInstance(String iniResourcePath, Configuration config,
            CacheManager cacheService) {
        ShiroTextRealm iniRealm = loadRealm(iniResourcePath);
        Collection<Realm> realms = Collections.singletonList(iniRealm);
        return createInstance(realms, config, cacheService);
    }

    /**
     * Create an isolated {@link PlatformSecurityManager} for testing purposes. See
     * {@link ResearchSpaceShiroRule} for usage.
     * 
     * @param realms
     * @param config
     * @return
     */
    public static PlatformSecurityManager createInstance(Collection<Realm> realms, Configuration config,
            CacheManager cacheService) {
        PlatformSecurityManager securityManager = new PlatformSecurityManager(realms, config, cacheService);
        securityManager.setPasswordService(new DefaultPasswordService());
        return securityManager;
    }

    /**
     * Load a {@link ShiroTextRealm} from the given resource. See
     * {@link ResearchSpaceShiroRule} for usage.
     * 
     * @param iniResourcePath ini file resource, e.g.
     *                        classpath:org/researchspace/security/shiro-templates-rights.ini
     * @return
     */
    public static ShiroTextRealm loadRealm(String iniResourcePath) {
        CredentialsMatcher passwordMatcher = new SimpleCredentialsMatcher();
        Ini ini = Ini.fromResourcePath(iniResourcePath);
        ShiroTextRealm iniRealm = new ShiroTextRealm(ini, passwordMatcher);
        return iniRealm;
    }

}
