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

import javax.annotation.Nullable;

/**
 * Base class for {@link SecretResolver}s performing simple {@link String}
 * lookup operations.
 * 
 * <p>
 * Implementations of a {@link SecretResolver} store should implement/override
 * either {@link #doLookup(String)} or {@link #doLookupSecret(String)} look up
 * an entry in the password store.
 * </p>
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public abstract class AbstractSecretResolver implements SecretResolver {

    private String prefix;

    public AbstractSecretResolver() {
        this(null);
    }

    public AbstractSecretResolver(@Nullable String prefix) {
        this.prefix = prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public String getPrefix() {
        return prefix;
    }

    @Override
    public Optional<Secret> resolveSecret(SecretLookup lookup) {
        String lookupKey = lookup.getLookupKey();
        Optional<String> name = nameForKey(lookupKey);
        if (!name.isPresent()) {
            // the key cannot be resolved to a name
            return Optional.empty();
        }
        String key = name.get();

        // perform lookup and translate the result into a secret
        return lookupSecret(key);
    }

    /**
     * Lookup a value for the provided key.
     * 
     * <p>
     * Either this method or {@link #lookup(String)} needs to be implemented by
     * sub-classes. This implementation delegates to {@link #lookup(String)} for
     * simple secret resolvers supporting only Strings. More advanced
     * implementations may override this method to also support stream-based
     * secrets.
     * </p>
     * 
     * @param key key to look up
     * @return Secret or empty optional if not available. This method should not
     *         return any fallback values!
     */
    protected Optional<Secret> lookupSecret(String key) {
        return lookup(key).map(s -> Secret.fromString(s));
    }

    /**
     * Lookup a value for the provided key.
     * 
     * <p>
     * Either this method or {@link #lookupSecret(String)} needs to be overridden by
     * sub-classes. This implementation simply throws an exception.
     * </p>
     * 
     * @param key key to look up
     * @return value or empty optional if not available. This method should not
     *         return any fallback values!
     */
    protected Optional<String> lookup(String key) {
        throw new IllegalArgumentException(
                "Secret lookup not implemented! Override either this method or lookupSecret()");
    }

    /**
     * Translate the key into something that is acceptable for the target system,
     * e.g. replace illegal characters for environment variables with underscores
     * and make it upper case. The default implementation returns the key unchanged.
     * 
     * @param key key to translate
     * @return (possibly) translated key or empty optional if the key cannot be
     *         used. In the latter case no lookup will be performed
     */
    protected Optional<String> nameForKey(String key) {
        if (key == null) {
            return Optional.empty();
        }
        if (prefix != null) {
            key = prefix + key;
        }
        return Optional.of(key);
    }

}
