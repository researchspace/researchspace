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
 * Shiro value factory that can be used to enable override of default parameters
 * in the .ini config files.
 *
 * e.g in the shiro-sso-keycloak-default.ini we can define:
 * realm = org.researchspace.security.sso.ConfigParameterStringValueFactory
 *
 * and then use it in the file, even so by default it is null, later we can set
 * this value in the shiro-sso-keycloak-params.ini like:
 * realm.value = my_realm
 */
public class ConfigParameterStringValueFactory implements Factory<String> {
    private String value;

    @Override
    public String getInstance() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
