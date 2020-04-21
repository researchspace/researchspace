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

package org.researchspace.secrets;

/**
 * Registry for {@link SecretResolver}s.
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public interface SecretResolverRegistry extends Iterable<SecretResolver> {
    /**
     * Add a {@link SecretResolver}.
     * 
     * @param resolver resolver to add
     */
    void addSecretResolver(SecretResolver resolver);

    /**
     * Remove a {@link SecretResolver}
     * 
     * @param resolver resolver to remove
     */
    void removeSecretResolver(SecretResolver resolver);

    /**
     * Remove all {@link SecretResolver}s.
     */
    void removeAllSecretResolvers();
}
