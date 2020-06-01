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

import javax.inject.Inject;
import javax.inject.Provider;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.util.ThreadContext;
import org.apache.shiro.web.servlet.AdviceFilter;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class AnonymousUserFilter extends AdviceFilter {

    @Inject
    private Provider<PlatformSecurityManager> securityManager;

    private static final String ORIGINAL_SUBJECT = AnonymousUserFilter.class.getName() + ".originalSubject";

    @Override
    protected boolean preHandle(final ServletRequest request, final ServletResponse response) throws Exception {
        Subject subject = SecurityUtils.getSubject();

        if (subject.getPrincipal() == null) {
            request.setAttribute(ORIGINAL_SUBJECT, subject);
            subject = securityManager.get().getAnonymousSubject();
            ThreadContext.bind(subject);
        }

        return true;
    }

    @Override
    public void afterCompletion(final ServletRequest request, final ServletResponse response, final Exception exception)
            throws Exception {
        Subject subject = (Subject) request.getAttribute(ORIGINAL_SUBJECT);
        if (subject != null) {
            ThreadContext.bind(subject);
        }
    }
}
