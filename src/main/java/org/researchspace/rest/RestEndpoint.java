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

package org.researchspace.rest;

import org.researchspace.plugin.extension.RestExtension;

/**
 * Marker interface for registering additional endpoints in the
 * {@link RestApplication} using the service loader mechanism.
 * 
 * <p>
 * <b>Important:</b>Implementations must provide a default constructor. Note
 * that injection using Guice can still be used by defining the annotations to
 * appropriate fields.
 * </p>
 * 
 * </p>
 * <p>
 * See also {@link RestExtension} for the same concept for plugins
 * </p>
 * 
 * <p>
 * Note that the implementing class and the service loader definition must be on
 * the classpath of the webapp, i.e. not part of an app.
 * </p>
 * 
 * @author as
 * @see RestExtension
 * @see RestApplication
 */
public interface RestEndpoint {

}
