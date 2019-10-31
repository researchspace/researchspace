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

import static com.google.common.base.Preconditions.checkNotNull;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;

import com.github.jknack.handlebars.Options;

/**
 * Handlebars helper to check whether current authenticated {@link Subject}
 * has specified permission.
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class HasPermissionHelperSource {

    private static final Logger logger = LogManager.getLogger(HasPermissionHelperSource.class);

    public String hasPermission(String param0, Options options) {
        String permission = checkNotNull(param0, "Persmission string must not be null.");
        boolean permitted = SecurityUtils.getSubject().isPermitted(permission);
        logger.trace("Checking permission in {} template helper. Permission?: {}", options.helperName, permitted );
        // see https://github.com/jknack/handlebars.java/issues/483
        return permitted ? "true" : "";
      }
}