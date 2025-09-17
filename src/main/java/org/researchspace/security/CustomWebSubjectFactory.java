/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
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
package org.researchspace.security;

import javax.servlet.http.HttpServletRequest;

import org.apache.shiro.subject.Subject;
import org.apache.shiro.subject.SubjectContext;
import org.apache.shiro.web.subject.WebSubjectContext;

import io.buji.pac4j.subject.Pac4jSubjectFactory;

/* 
 * Disable session creation for Basic Auth requests.
 * It is just an additional overhead that doesn't make any sense.
 */
public class CustomWebSubjectFactory extends Pac4jSubjectFactory {

    @Override
    public Subject createSubject(SubjectContext context) {
        if (context instanceof WebSubjectContext) {
            WebSubjectContext wsc = (WebSubjectContext) context;
            HttpServletRequest request = (HttpServletRequest) wsc.resolveServletRequest();
            if (request != null && OptionalBasicAuthFilter.isAuthorizationAttempt(request)) {
                wsc.setSessionCreationEnabled(false);
            }
        }

        return super.createSubject(context);
    }
}