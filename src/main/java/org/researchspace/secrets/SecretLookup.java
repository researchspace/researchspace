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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.annotation.Nullable;

/**
 * A SecretLookup is used to lookup a secret value from a
 * {@link SecretResolver}.
 * 
 * <p>
 * The lookup string may contain both a key name as well as a fallback value
 * which is used if the key cannot be resolved.<br/>
 * The format of the lookup string is {@code ${key:fallback}) where {@code key}
 * specifies the key to look up using a {@link SecretResolver} and {@code
 * fallback} the fallback value which is returned if the lookup did not return a
 * value.
 * </p>
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 *
 */
public class SecretLookup {
    protected static final String PLACEHOLDER_PATTERN_STRING = "^\\$\\{([^:]+):?(.*)\\}$";
    protected static final Pattern PLACEHOLDER_PATTERN = Pattern.compile(PLACEHOLDER_PATTERN_STRING);

    private String key;
    private Optional<String> fallbackValue;

    public static Optional<SecretLookup> forValue(String key) {
        if (!isResolvableSecret(key)) {
            return Optional.empty();
        }
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(key);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        String keyPart = matcher.group(1);
        Optional<String> fallbackValue = Optional.empty();
        if (key.contains(":")) {
            fallbackValue = Optional.ofNullable(matcher.group(2));
        }
        return Optional.of(new SecretLookup(keyPart, fallbackValue));
    }

    public static Optional<SecretLookup> forKey(String key) {
        return forKey(key, null);
    }

    public static Optional<SecretLookup> forKey(String key, @Nullable String fallbackValue) {
        return Optional.of(new SecretLookup(key, Optional.ofNullable(fallbackValue)));
    }

    protected SecretLookup(String key, Optional<String> fallbackValue) {
        this.key = key;
        this.fallbackValue = fallbackValue;
    }

    /**
     * Get lookup key.
     * 
     * @return lookup key
     */
    public String getLookupKey() {
        return key;
    }

    /**
     * Get fallback value. The fallback value may be used if the lookup using the
     * key does not yield any results.
     * 
     * @return fallback value or empty if not provided
     */
    public Optional<String> getFallbackValue() {
        return fallbackValue;
    }

    /**
     * Determine whether a provided string is a key for a resolvable key.
     * 
     * @param key key to check
     * @return <code>true</code> if the provided string is a key for a resolvable
     *         key, <code>false</code> otherwise
     */
    public static boolean isResolvableSecret(String key) {
        return PLACEHOLDER_PATTERN.matcher(key).matches();
    }

    /**
     * Returns the lookup key part from a {@code ${key:fallback}) secret key. @param
     * value value from which to extract the key part
     * 
     * @return key part or empty if the provided value does not contain a variable
     *         expression
     */
    public static Optional<String> getLookupKey(String value) {
        Optional<SecretLookup> lookup = forValue(value);
        if (lookup.isPresent()) {
            return Optional.of(lookup.get().getLookupKey());
        }
        return Optional.empty();
    }

    /**
     * Returns the fallback part from a {@code ${key:fallback}) secret key. @param
     * value value from which to extract the key part
     * 
     * @return fallback part or empty if the provided value does not contain a
     *         variable expression
     */
    public static Optional<String> getFallbackValue(String value) {
        Optional<SecretLookup> lookup = forValue(value);
        if (lookup.isPresent()) {
            return lookup.get().getFallbackValue();
        }
        return Optional.empty();
    }
}