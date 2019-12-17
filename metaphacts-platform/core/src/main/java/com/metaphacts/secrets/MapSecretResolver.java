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

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The MapSecretResolver looks up values from a provided {@link Map}.
 * 
 *  <p>
 *  Note: passwords stored in a {@link Map} are kept in memory as plaintext passwords, 
 *  so care should be taken when using this in production systems.
 *  </p> 
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class MapSecretResolver extends AbstractSecretResolver {
    private final Map<String, String> secrets = new ConcurrentHashMap<>();

    public MapSecretResolver() {
    }
    
    public MapSecretResolver(Map<String, String> secrets) {
        this.secrets.putAll(secrets);
    }
    
    public MapSecretResolver addSecret(String key, String value) {
        secrets.put(key, value);
        
        return this;
    }
    
    public MapSecretResolver removeSecret(String key) {
        secrets.remove(key);
        
        return this;
    }
    
    public MapSecretResolver removeAllSecrets() {
        secrets.clear();
        
        return this;
    }

    @Override
    protected Optional<String> lookup(String key) {
        return Optional.ofNullable(secrets.get(key));
    }
}
