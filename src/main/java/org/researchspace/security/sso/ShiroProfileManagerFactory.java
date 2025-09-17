/**
 * ResearchSpace
 * Copyright (C) 2025, Pharos: The International Consortium of Photo Archives
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
package org.researchspace.security.sso;

import io.buji.pac4j.profile.ShiroProfileManager;
import org.pac4j.core.context.WebContext;
import org.pac4j.core.context.session.SessionStore;
import org.pac4j.core.profile.ProfileManager;
import org.pac4j.core.profile.factory.ProfileManagerFactory;

/**
 * A factory that creates Shiro-specific ProfileManager instances.
 * This class is necessary to bridge the generic pac4j configuration
 * with the Shiro-specific implementation required for subject login.
 */
public class ShiroProfileManagerFactory implements ProfileManagerFactory {

    @Override
    public ProfileManager apply(WebContext context, SessionStore sessionStore) {
        return new ShiroProfileManager(context, sessionStore);
    }
}