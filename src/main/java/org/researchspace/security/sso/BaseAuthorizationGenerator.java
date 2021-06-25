/**
 * ResearchSpace Copyright (C) 2020, © Trustees of the British Museum
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

import java.util.Collection;
import java.util.Optional;

import org.apache.shiro.authz.SimpleRole;
import org.pac4j.core.context.WebContext;
import org.pac4j.core.context.session.SessionStore;
import org.pac4j.core.profile.UserProfile;
import org.researchspace.security.ShiroTextRealm;

public class BaseAuthorizationGenerator implements org.pac4j.core.authorization.generator.AuthorizationGenerator {

    private Collection<String> defaultRoles;
    private ShiroTextRealm textRealm;

    public BaseAuthorizationGenerator() {}

    public void setTextRealm(ShiroTextRealm realm) {
        this.textRealm = realm;
    }

    @Override
    public Optional<UserProfile> generate(WebContext arg0, SessionStore sessionStore, UserProfile profile) {
        if (defaultRoles != null) {
            profile.addRoles(defaultRoles);
        }
        profile.getRoles().forEach(role -> this.addPermissions(profile, role));
        return Optional.of(profile);
    }

    private void addPermissions(UserProfile profile, String role) {
        final SimpleRole shiroRole = this.textRealm.getRoles().get(role);
        if (shiroRole != null) {
            shiroRole.getPermissions().forEach(p -> {
                profile.addPermission(p.toString());
            });
        }
    }

    public void setDefaultRoles(Collection<String> defaultRoles) {
        this.defaultRoles = defaultRoles;
    }
}
