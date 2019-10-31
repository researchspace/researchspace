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

import java.util.Collection;

import javax.inject.Inject;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.config.Ini;
import org.apache.shiro.config.IniSecurityManagerFactory;
import org.apache.shiro.mgt.SecurityManager;
import org.apache.shiro.realm.Realm;
import org.apache.shiro.realm.text.IniRealm;
import org.apache.shiro.util.Factory;
import org.apache.shiro.util.LifecycleUtils;
import org.apache.shiro.util.ThreadContext;
import org.junit.runners.model.FrameworkMethod;
import org.junit.runners.model.Statement;

import com.github.sdorra.shiro.ShiroRule;
import com.github.sdorra.shiro.SubjectAware;
import com.github.sdorra.shiro.internal.SubjectAwareDescriptor;
import com.github.sdorra.shiro.internal.SubjectAwares;
import com.metaphacts.config.Configuration;
import com.metaphacts.security.WildcardPermissionResolver;

import org.apache.shiro.mgt.DefaultSecurityManager;
import org.apache.shiro.authz.ModularRealmAuthorizer;

/**
 * Extension of {@link ShiroRule} which uses {@link MetaphactsSecurityManager}
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MetaphactsShiroRule extends ShiroRule {
    
    
    protected class MetaphactsTestIniSecurityManagerFactory extends IniSecurityManagerFactory {

        WildcardPermissionResolver permissionResolver = new WildcardPermissionResolver();

        public MetaphactsTestIniSecurityManagerFactory(String iniResourcePath) {
            super(iniResourcePath);
        }

        @Override
        protected Realm createRealm(Ini ini) {
            
            IniRealm realm = new IniRealm();
            realm.setPermissionResolver(permissionResolver);
            realm.setName(INI_REALM_NAME);
            realm.setIni(ini); //added for SHIRO-322
            return realm;
        }

        @Override
        protected SecurityManager createInstance(Ini ini) {
            // TODO Auto-generated method stub
            DefaultSecurityManager securityManager = (DefaultSecurityManager)super.createInstance(ini);
            
            ModularRealmAuthorizer authorizer = (ModularRealmAuthorizer) securityManager.getAuthorizer();
            authorizer.setPermissionResolver(permissionResolver);
            return securityManager;
        }
        
        
        
    }

    public MetaphactsShiroRule() {
    }

    @Override
    public Statement apply(Statement base, FrameworkMethod method, Object target) {
        tearDownShiro(); // clean up whatever other tests might have left behind

        final SubjectAwareDescriptor desc = new SubjectAwareDescriptor();
        SubjectAware subjectAware = SubjectAwares.find(target);

        if (subjectAware != null) {
            desc.merge(subjectAware);
        }

        subjectAware = SubjectAwares.find(method.getAnnotations());

        if (subjectAware != null) {
            desc.merge(subjectAware);
        }

        return new Statement() {

            @Override
            public void evaluate() throws Throwable {
                if (desc.isMerged()) {
                    initializeSecurityManager(desc);
                }

                try {
                    base.evaluate();
                } finally {
                    tearDownShiro();
                }
            }
        };
    }

    /**
     * Method description
     *
     *
     * @param subjectAware
     */
    private void initializeSecurityManager(SubjectAwareDescriptor subjectAware) {
        String cfg = subjectAware.getConfiguration();

        if (cfg.length() > 0) {
            Factory<SecurityManager> factory = new MetaphactsTestIniSecurityManagerFactory(cfg);
            SecurityManager securityManager = factory.getInstance();
            SecurityUtils.setSecurityManager(securityManager);
        }

        String username = subjectAware.getUsername();

        if ((username != null) && (username.length() > 0)) {
            UsernamePasswordToken token = new UsernamePasswordToken(username,
                    subjectAware.getPassword());

            SecurityUtils.getSubject().login(token);
        }
    }

    /**
     * Method description
     *
     */
    private void tearDownShiro() {
        try {
            SecurityManager securityManager = SecurityUtils.getSecurityManager();

            LifecycleUtils.destroy(securityManager);
            ThreadContext.unbindSecurityManager();
            ThreadContext.unbindSubject();
            ThreadContext.remove();
        } catch (UnavailableSecurityManagerException e) {

            // we don't care about this when cleaning up the test environment
            // (for example, maybe the subclass is a unit test and it didn't
            // need a SecurityManager instance because it was using only mock Subject instances)
        }

        SecurityUtils.setSecurityManager(null);
    }

}
