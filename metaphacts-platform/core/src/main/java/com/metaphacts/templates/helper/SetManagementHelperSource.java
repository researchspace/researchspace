/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.templates.helper;

import com.github.jknack.handlebars.Options;
import com.metaphacts.data.rdf.container.UserSetRootContainer;
import org.apache.shiro.SecurityUtils;

/**
 * Helpers to get {@link UserSetRootContainer user sets container} and
 * user default {@link com.metaphacts.data.rdf.container.SetContainer set}.
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
 * @see com.metaphacts.rest.endpoint.SetManagementEndpoint
 *
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Alexey Morozov
 */
public class SetManagementHelperSource {
    public String setContainerIri(Options options) {
        Object userParam = options.hash("username");
        String username = userParam == null ? SecurityUtils.getSubject().getPrincipal().toString() : (String)userParam;
        return UserSetRootContainer.setContainerIriForUser(username);
    }

    public String defaultSetIri(Options options) {
        Object userParam = options.hash("username");
        String username = userParam == null ? SecurityUtils.getSubject().getPrincipal().toString() : (String)userParam;
        return UserSetRootContainer.defaultSetIriForUser(username);
    }
}
