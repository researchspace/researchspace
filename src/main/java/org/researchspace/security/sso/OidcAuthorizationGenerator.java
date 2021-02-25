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

import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import com.nimbusds.jwt.SignedJWT;

import org.pac4j.core.context.WebContext;
import org.pac4j.core.context.session.SessionStore;
import org.pac4j.core.profile.UserProfile;
import org.pac4j.oidc.profile.OidcProfile;

public class OidcAuthorizationGenerator extends BaseAuthorizationGenerator {

    private List<String> roleJsonPaths;
    private Configuration jsonPathConfig;

    public OidcAuthorizationGenerator() {
        super();
        this.jsonPathConfig = Configuration.builder()
            // This option makes sure no exceptions are propagated from path evaluation. If path doesn't exist null will be returned.
            .options(Option.SUPPRESS_EXCEPTIONS)
            .build();
    }

    @Override
    public Optional<UserProfile> generate(WebContext arg0, SessionStore sessionStore, UserProfile profile) {
        try {
            SignedJWT jwt = SignedJWT.parse(((OidcProfile) profile).getAccessToken().getValue());
            String jwtClaimsSet = jwt.getPayload().toString();
            DocumentContext json = JsonPath.using(this.jsonPathConfig).parse(jwtClaimsSet);
            for (String path : this.roleJsonPaths) {
                List<String> roles = json.read(path);
                if (roles != null) {
                    profile.addRoles(roles);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return super.generate(arg0, sessionStore, profile);
    }

    public void setRoleJsonPaths(List<String> roleJsonPaths) {
        this.roleJsonPaths = roleJsonPaths;
    }
}
