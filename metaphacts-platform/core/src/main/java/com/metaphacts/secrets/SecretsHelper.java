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

package com.metaphacts.secrets;

import java.util.Optional;

import javax.annotation.Nullable;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * Helper class for secrets handling
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class SecretsHelper {
    private static final Logger logger = LogManager.getLogger(SecretsHelper.class);
    
    /**
     * Resolve secret or return the original value. Secrets are only resolved if a resolver is provided  
     * and the key has placeholder markers. Otherwise the original value or <code>null</code> is returned.
     * Any exceptions in a {@link SecretResolver} are caught and ignored, instead the fallback value is returned.
     * 
     * @param secretResolver secrets resolver or <code>null</code> if not available. 
     *          In this case the provided key is passed unchanged
     * @param value key to resolve. The format of the lookup string is {@code ${key:fallback}) where {@code key} 
     *          specifies the key to look up using a {@link SecretResolver} and {@code fallback} the fallback
     *          value which is returned if the lookup did not return a value.
     * @return if value contains a lookup key, the resolved secret is returned. If the secret could not be resolved either the fallback value (if specified) or <code>null</code> is returned.
     *          if value does not contain a lookup key, it is returned directly 
     * @see #isResolvableSecret(String)
     */
    public static String resolveSecretOrFallback(@Nullable SecretResolver secretResolver, @Nullable String value) {
        if (value == null) {
            return null;
        }
        Optional<SecretLookup> lookup = SecretLookup.forValue(value);
        if (!lookup.isPresent()) {
            // return original value
            return value;
        }
        Optional<String> secret = resolveSecretAsString(secretResolver, lookup);
        if (secret.isPresent()) {
            return secret.get();
        }
        Optional<String> fallback = lookup.get().getFallbackValue();
        return fallback.orElse(null);
    }
    
    /**
     * Resolve secret (if applicable). Secrets are only resolved if a resolver is provided  
     * and the key has placeholder markers.
     * Any exceptions in a {@link SecretResolver} are caught and ignored, instead an empty result is returned.
     * 
     * @param secretResolver secrets resolver or <code>null</code> if not available. 
     *          In this case the provided key is passed unchanged
     * @param value key to resolve. The format of the lookup string is {@code ${key:fallback}) where {@code key} 
     *          specifies the key to look up using a {@link SecretResolver} and {@code fallback} the fallback
     *          value which is returned if the lookup did not return a value.
     * @return resolved secret. If the secret could not be resolved an empty {@link Optional} is returned 
     * @see #isResolvableSecret(String)
     */
    public static Optional<String> resolveSecretAsString(@Nullable SecretResolver secretResolver, @Nullable String value) {
        if (value == null) {
            return Optional.empty();
        }
        return resolveSecretAsString(secretResolver, SecretLookup.forValue(value));
    }
    
    /**
     * Resolve secret (if applicable). Secrets are only resolved if both a resolver and lookup are provided.
     * Any exceptions in a {@link SecretResolver} are caught and ignored, instead an empty result is returned.  
     * 
     * @param secretResolver secrets resolver or <code>null</code> if not available. 
     *          In this case the provided key is passed unchanged
     * @param lookup secret lookup to resolve
     * @return resolved secret. If the secret could not be resolved the {@link SecretLookup}'s     
     *          fallback value is returned if provided, otherwise an empty {@link Optional}.
     */
    public static Optional<String> resolveSecretAsString(@Nullable SecretResolver secretResolver, Optional<SecretLookup> lookup) {
        Secret secret = null;
        try {
            Optional<Secret> s = resolveSecret(secretResolver, lookup);
            if (!s.isPresent()) {
                return Optional.empty();
            }
            secret = s.get();
            return Optional.ofNullable(secret.getSecretAsString());
        }
        finally {
            if (secret != null) {
                try {
                    secret.close();
                } catch (Exception e) {
                    // ignore exception
                    logger.debug("Failed to close secret: {}", e.getMessage());
                    logger.debug("Details:", e);
                    return Optional.empty();
                }
            }
        }
    }
    
    /**
     * Resolve secret (if applicable). Secrets are only resolved if a resolver is provided  
     * and the key has placeholder markers.
     * Any exceptions in a {@link SecretResolver} are caught and ignored, instead an empty result is returned.
     * 
     * @param secretResolver secrets resolver or <code>null</code> if not available. 
     *          In this case the provided key is passed unchanged
     * @param value key to resolve. The format of the lookup string is {@code ${key:fallback}) where {@code key} 
     *          specifies the key to look up using a {@link SecretResolver} and {@code fallback} the fallback
     *          value which is returned if the lookup did not return a value.
     * @return resolved secret. If the secret could not be resolved an empty {@link Optional} is returned 
     * @see #isResolvableSecret(String)
     */
    public static Optional<Secret> resolveSecret(@Nullable SecretResolver secretResolver, @Nullable String value) {
        if (value == null) {
            return Optional.empty();
        }
        return resolveSecret(secretResolver, SecretLookup.forValue(value));
    }
    
    /**
     * Resolve secret (if applicable). Secrets are only resolved if both a resolver and lookup are provided.
     * Any exceptions in a {@link SecretResolver} are caught and ignored, instead an empty result is returned.  
     * 
     * @param secretResolver secrets resolver or <code>null</code> if not available. 
     *          In this case the provided key is passed unchanged
     * @param lookup secret lookup to resolve
     * @return resolved secret. If the secret could not be resolved the {@link SecretLookup}'s     
     *          fallback value is returned if provided, otherwise an empty {@link Optional}.
     */
    public static Optional<Secret> resolveSecret(@Nullable SecretResolver secretResolver, Optional<SecretLookup> lookup) {
        if (!lookup.isPresent()) {
            return Optional.empty();
        }
        
        if (secretResolver == null) {
            return Optional.empty();
        }
        
        SecretLookup secretLookup = lookup.get();
        try {
            Optional<Secret> result = secretResolver.resolveSecret(secretLookup);
            if (result.isPresent()) {
                return result;
            }
        } catch (Exception e) {
            logger.debug("Failed to resolve secret using {}: {}", secretResolver, e.getMessage());
            logger.debug("Details:", e);
            return Optional.empty();
        }
        Optional<String> optFallbackValue = secretLookup.getFallbackValue();
        if (!optFallbackValue.isPresent()) {
            logger.debug("No secret (nor fallback) defined for key {}", lookup.get().getLookupKey());
        }
        return optFallbackValue.map(fallbackValue -> Secret.fromString(fallbackValue));
    }
    
    /**
     * Determine whether a provided string is a key for a resolvable key.
     * @param value key to check
     * @return <code>true</code> if the provided string is a key for a 
     *          resolvable key, <code>false</code> otherwise
     */
    public static boolean isResolvableSecret(String value) {
        return SecretLookup.forValue(value).isPresent();
    }
}
