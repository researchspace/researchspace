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

import java.util.Map;

import org.apache.shiro.web.env.IniWebEnvironment;
import org.researchspace.config.Configuration;

/**
 * @author Artem Kozlov {@literal <ak@metaphacts.com>}
 */
public class SSOEnvironment extends IniWebEnvironment {

    private static final String USERS = "users";

    private SSOUsersRegistry users;

    public SSOEnvironment(Configuration config) {
        this.users = new SSOUsersRegistry(config);
    }

    @Override
    protected Map<String, Object> getDefaults() {
        Map<String, Object> defaults = super.getDefaults();
        defaults.put(USERS, users);
        return defaults;
    }
}
