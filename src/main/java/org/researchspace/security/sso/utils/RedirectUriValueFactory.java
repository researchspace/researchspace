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

package org.researchspace.security.sso.utils;

import org.apache.shiro.util.Factory;

/**
 * Construct instance SSO callback URL based on the config.environment.platformBaseIri, set in the active shiro-sso-*-default.ini file.
 */
public class RedirectUriValueFactory implements Factory<String> {
    private String instanceBaseUri;

    @Override
    public String getInstance() {
        return instanceBaseUri + "/sso/callback";
    }

    public void setInstanceBaseUri(String value) {
        this.instanceBaseUri = value;
    }
}
