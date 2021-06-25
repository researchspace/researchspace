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

import java.util.List;
import java.util.Optional;

import org.pac4j.core.context.WebContext;
import org.pac4j.core.context.session.SessionStore;
import org.pac4j.core.profile.UserProfile;
import org.pac4j.saml.profile.SAML2Profile;

public class SAML2AuthorizationGenerator extends BaseAuthorizationGenerator {
    private String rolesAttribute;

    public SAML2AuthorizationGenerator() {
        super();
    }

    public void setRolesAttribute(String rolesAttribute) {
        this.rolesAttribute = rolesAttribute;
    }

    @Override
    public Optional<UserProfile> generate(WebContext arg0, SessionStore sessionStore, UserProfile profile) {
        SAML2Profile saml2Profile = (SAML2Profile) profile;
        saml2Profile.addAttribute("NameId", saml2Profile.getId());
        List<String> roles = saml2Profile.extractAttributeValues(this.rolesAttribute);
        profile.addRoles(roles);
        return super.generate(arg0, sessionStore, profile);
    }
}
