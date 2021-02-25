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
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.Logger;
import org.apache.shiro.config.Ini;
import org.apache.shiro.config.Ini.Section;
import org.apache.shiro.realm.activedirectory.ActiveDirectoryRealm;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsHelper;

public class ShiroRealmUtils {
    /**
     * Delimiter according to which the role names specified in the groupRolesMap
     * should be split.
     */
    private static final String ROLE_NAMES_DELIMETER = ",";

    /**
     * Mainly adapted from @see {@link ActiveDirectoryRealm} This method is called
     * by the default implementation to translate Active Directory group names to
     * role names. This implementation uses the groupRolesMap to map group names to
     * role names.
     *
     * @param mapping    between roles and user groups
     * @param groupNames the group names that apply to the current user.
     * @return a collection of roles that are implied by the given role names.
     */
    public static Collection<String> getRoleNamesForGroups(Logger logger, Map<String, String> groupRolesMap,
            Collection<String> groupNames) {
        Set<String> roleNames = new HashSet<String>(groupNames.size());

        if (groupRolesMap != null) {
            for (String groupName : groupNames) {
                String strRoleNames = groupRolesMap.get(groupName);
                if (strRoleNames != null) {
                    for (String roleName : strRoleNames.split(ROLE_NAMES_DELIMETER)) {
                        logger.trace("User is member of group [{}] so adding role [{}]", groupName, roleName);
                        roleNames.add(roleName);
                    }
                } else {
                    logger.trace("Did not find any group to role mappings for groupName: {}", groupName);
                }
            }
        }
        return roleNames;
    }


    /**
     * Resolve externally defined variables in the .ini file using provided secret
     * resolver. Placeholder reference should be enclosed in \${}, e.g:
     * clientId.value = \${RS_SSO_CLIENT_ID}
     */
    public static void resolveSecrets(Set<String> settingsWithSecrets, Ini ini, SecretResolver secretResolver) {
        // iterate over all sections and replace known settings containing secrets
        for (String sectionName : ini.getSectionNames()) {
            Section section = ini.getSection(sectionName);
            section.replaceAll((key, value) -> {
                if (settingsWithSecrets.contains(key)) {
                    if (value.startsWith("\\${") && value.endsWith("}")) {
                        // get rid of the leading \ which might be used to escape the $
                        value = value.substring(1);
                    }
                    return SecretsHelper.resolveSecretOrFallback(secretResolver, value);
                }
                return value;
            });
        }
    }
}
