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

import java.util.Optional;

/**
 * This interface is used to resolve secrets from a concrete store, such as a
 * password safe or external source like system properties or environment
 * variables.
 * 
 * <p>
 * A secret can be any kind of information and is identified by a key. Examples
 * are passwords, tokens, user names, but also streams of data, e.g. to load a
 * certificate or keystore.
 * </p>
 * 
 * <p>
 * Interpreting the key e.g. to derive some additional information regarding the
 * source is left to each implementation of a {@link SecretResolver}. Keys might
 * contain hints to a filename or be interpreted as (part of) a property name or
 * environment variable.
 * </p>
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public interface SecretResolver {
    /**
     * Resolve secret. Secrets are only resolved if the {@link SecretLookup}'s key
     * has placeholder markers, i.e. something like <code>${key}</code> or
     * <code>${key:defaultValue}</code>.
     * 
     * @param lookup secret lookup to resolve
     * @@return resolved secret. If the secret could not be resolved an empty
     *          {@link Optional} is returned
     */
    public Optional<Secret> resolveSecret(SecretLookup lookup);
}
