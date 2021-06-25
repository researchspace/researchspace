/**
 * ResearchSpace Copyright (C) 2021, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.security.sso;

import javax.inject.Inject;
import javax.inject.Provider;

import org.apache.shiro.realm.Realm;

/**
 * Provides realm defined in the shiro web environment. E.g see shiro-sso-keycloak-default.ini.
 */
public class SSORealmProvider implements Provider<Realm> {
    private SSORealm realm;

    @Inject
    public SSORealmProvider(SSOEnvironment env) {
        this.realm = env.getObject("shiroRealm", SSORealm.class);
        this.realm.setSsoEnvironment(env);
    }

    @Override
    public Realm get() {
        return this.realm;
    }
}
