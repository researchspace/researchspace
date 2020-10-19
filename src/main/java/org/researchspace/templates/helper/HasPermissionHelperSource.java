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

import static com.google.common.base.Preconditions.checkNotNull;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.researchspace.templates.TemplateContext;

import com.github.jknack.handlebars.Options;

/**
 * Handlebars helper to check whether current authenticated {@link Subject} has
 * specified permission.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class HasPermissionHelperSource {

    private static final Logger logger = LogManager.getLogger(HasPermissionHelperSource.class);

    public String hasPermission(String param0, Options options) {
        String permission = checkNotNull(param0, "Persmission string must not be null.");
        boolean permitted = SecurityUtils.getSubject().isPermitted(permission);
        logger.trace("Checking permission in {} template helper. Permission?: {}", options.helperName, permitted);
        // see https://github.com/jknack/handlebars.java/issues/483
        return permitted ? "true" : "";
    }

    public String userUri(Options options) {
        TemplateContext context = (TemplateContext) options.context.model();
        return context.getNamespaceRegistry().get().getUserIRI().stringValue();
    }
}
