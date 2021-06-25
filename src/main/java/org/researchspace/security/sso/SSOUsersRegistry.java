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

package org.researchspace.security.sso;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.config.Ini;
import org.apache.shiro.realm.text.IniRealm;
import org.researchspace.config.Configuration;
import org.researchspace.security.SecurityConfigRecord;
import org.researchspace.security.SecurityConfigType;

/**
 * Local users registry that can be used for authorization in SSO environment.
 * 
 * @author Artem Kozlov {@literal <ak@metaphacts.com>}
 */
public class SSOUsersRegistry {

    private Map<String, Collection<String>> users = new HashMap<>();

    public SSOUsersRegistry(Configuration config) {
        SecurityConfigRecord record = config.getEnvironmentConfig()
                .getSecurityConfig(SecurityConfigType.ShiroUsers);
        if (record.exists()) {
            Ini ini = SecurityConfigRecord.readIni(record);
            initUsers(ini.getSection(IniRealm.USERS_SECTION_NAME));
        }
    }

    public Collection<String> getRolesForUser(String principal) {
        return Optional.ofNullable(users.get(principal)).orElse(Collections.emptyList());
    }

    private void initUsers(Map<String, String> userDefs) {
        if (userDefs == null || userDefs.isEmpty()) {
            return;
        }

        userDefs.keySet().stream().forEach(userId -> {
            String userRoles = userDefs.get(userId);
            String[] roles = StringUtils.split(userRoles, ',');
            users.put(userId, Arrays.asList(roles));
        });
    }
}
