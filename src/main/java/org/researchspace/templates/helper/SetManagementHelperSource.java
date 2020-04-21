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

package org.researchspace.templates.helper;

import com.github.jknack.handlebars.Options;

import org.apache.shiro.SecurityUtils;
import org.researchspace.data.rdf.container.UserSetRootContainer;

/**
 * Helpers to get {@link UserSetRootContainer user sets container} and user
 * default {@link org.researchspace.data.rdf.container.SetContainer set}.
 *
 * <pre>
 * <code>
 *   [[#setContainerIri]]
 *   [[#setContainerIri username="username"]]
 *   [[#defaultSetIri]]
 *   [[#defaultSetIri username="username"]]
 * </code>
 * </pre>
 *
 * @see org.researchspace.rest.endpoint.SetManagementEndpoint
 *
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Alexey Morozov
 */
public class SetManagementHelperSource {
    public String setContainerIri(Options options) {
        Object userParam = options.hash("username");
        String username = userParam == null ? SecurityUtils.getSubject().getPrincipal().toString() : (String) userParam;
        return UserSetRootContainer.setContainerIriForUser(username);
    }

    public String defaultSetIri(Options options) {
        Object userParam = options.hash("username");
        String username = userParam == null ? SecurityUtils.getSubject().getPrincipal().toString() : (String) userParam;
        return UserSetRootContainer.defaultSetIriForUser(username);
    }
}
