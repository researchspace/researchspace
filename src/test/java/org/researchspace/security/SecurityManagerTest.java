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

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import javax.inject.Inject;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.cache.Cache;
import org.apache.shiro.realm.AuthenticatingRealm;
import org.apache.shiro.subject.Subject;
import org.jukito.UseModules;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.junit.ResearchSpaceGuiceTestModule;
import org.researchspace.junit.ResearchSpaceJukitoRunner;
import org.researchspace.junit.ResearchSpaceShiroRule;
import org.researchspace.security.PlatformSecurityManager;

import com.google.common.collect.Maps;

@RunWith(ResearchSpaceJukitoRunner.class)
@UseModules(ResearchSpaceGuiceTestModule.class)
public class SecurityManagerTest {

    @Inject
    public Configuration configuration;

    // @Inject TODO use injection instead of test implementation
    public CacheManager cacheService = new CacheManager() {
        @Override
        protected String getCacheSpec(String cacheId) {
            // configure special retention on the cache for the test
            // => keep only two items at maximum
            if (PlatformSecurityManager.AUTH_CACHE_NAME.equals(cacheId)) {
                return "maximumSize=2";
            }
            return super.getCacheSpec(cacheId);
        }
    };

    private TestAuthenticatingRealm testRealm = new TestAuthenticatingRealm();

    @Rule
    public ResearchSpaceShiroRule rule = new ResearchSpaceShiroRule(() -> Collections.singletonList(testRealm),
            () -> configuration).withCacheManager(() -> cacheService);

    @Before
    public void before() {

        testRealm.reset();
    }

    @Test
    public void testCaching() throws Exception {

        testRealm.addAcceptedUser("admin", "admin");

        final Subject subject = SecurityUtils.getSubject();
        final PlatformSecurityManager securityManager = (PlatformSecurityManager) SecurityUtils.getSecurityManager();
        final Cache<Object, Object> authCache = securityManager.getCacheManager()
                .getCache(PlatformSecurityManager.AUTH_CACHE_NAME);

        Assert.assertEquals(0, authCache.size());
        Assert.assertEquals(0, testRealm.loginCount.get());

        securityManager.login(subject, new UsernamePasswordToken("admin", "admin"));

        // assert that entry is cached
        Assert.assertEquals(1, authCache.size());
        AuthenticationInfo authInfo = (AuthenticationInfo) authCache.values().iterator().next();
        Assert.assertEquals("admin", authInfo.getPrincipals().getPrimaryPrincipal());
        Assert.assertNotEquals("admin", authInfo.getCredentials());
        Assert.assertTrue(authInfo.getCredentials().toString().startsWith("$shiro1$"));
        Assert.assertEquals(1, testRealm.loginCount.get());

        // make sure that the cache is used, i.e. login count from the realm does not
        // increase
        securityManager.login(subject, new UsernamePasswordToken("admin", "admin"));
        Assert.assertEquals(1, testRealm.loginCount.get());
        Assert.assertEquals(1, authCache.size());

        // provide a wrong password => cache should be cleared
        try {
            securityManager.login(subject, new UsernamePasswordToken("admin", "wrong-pass"));
            Assert.fail("Expected authentication exception");
        } catch (AuthenticationException e) {
            // expected
        }
        Assert.assertEquals(0, authCache.size());
        Assert.assertEquals(2, testRealm.loginCount.get());

        // login again successfully
        securityManager.login(subject, new UsernamePasswordToken("admin", "admin"));
        Assert.assertEquals(1, authCache.size());
        Assert.assertEquals(3, testRealm.loginCount.get());
    }

    @Test
    public void testCacheRetention() throws Exception {

        for (int i = 1; i <= 10; i++) {
            testRealm.addAcceptedUser("admin" + i, "admin");
        }

        final Subject subject = SecurityUtils.getSubject();
        final PlatformSecurityManager securityManager = (PlatformSecurityManager) SecurityUtils.getSecurityManager();

        final Cache<Object, Object> authCache = securityManager.getCacheManager()
                .getCache(PlatformSecurityManager.AUTH_CACHE_NAME);

        Assert.assertEquals(0, authCache.size());
        Assert.assertEquals(0, testRealm.loginCount.get());

        securityManager.login(subject, new UsernamePasswordToken("admin1", "admin"));

        Assert.assertEquals(1, authCache.size());
        Assert.assertEquals(1, testRealm.loginCount.get());

        securityManager.login(subject, new UsernamePasswordToken("admin1", "admin"));
        Assert.assertEquals(1, authCache.size());
        Assert.assertEquals(1, testRealm.loginCount.get());

        securityManager.login(subject, new UsernamePasswordToken("admin2", "admin"));
        Assert.assertEquals(2, authCache.size());
        Assert.assertEquals(2, testRealm.loginCount.get());

        securityManager.login(subject, new UsernamePasswordToken("admin3", "admin"));
        Assert.assertEquals(2, authCache.size()); // cache keeps at maximum two items
        Assert.assertEquals(3, testRealm.loginCount.get());

    }

    private final class TestAuthenticatingRealm extends AuthenticatingRealm {

        AtomicInteger loginCount = new AtomicInteger(0);

        Map<String, String> acceptedUsers = Maps.newHashMap();

        @Override
        protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
            loginCount.incrementAndGet();
            String acceptedUser = token.getPrincipal().toString();
            if (acceptedUsers.containsKey(acceptedUser)) {
                String acceptedPassword = acceptedUsers.get(acceptedUser);
                String password = new String((char[]) token.getCredentials());
                if (acceptedPassword.equals(password)) {
                    return new SimpleAuthenticationInfo(acceptedUser, acceptedPassword, "testRealm");
                }
            }
            throw new AuthenticationException("User could not be authenticated: " + token.getPrincipal());
        }

        public void addAcceptedUser(String user, String password) {
            acceptedUsers.put(user, password);
        }

        public void reset() {
            loginCount.set(0);
            acceptedUsers.clear();
        }
    }
}
