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

import java.util.Iterator;
import java.util.List;
import java.util.ServiceLoader;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * Default implementation of a {@link SecretResolverRegistry}. This implementation allows both manual 
 * registration of {@link SecretResolver}s as well as discovery of instances via the {@link ServiceLoader}
 * by calling {@link #discoverResolvers()}. 
 * 
 * <p>
 * Note: discovered {@link SecretResolver} have no particular ordering, the order may be different on 
 * repeated invocations and depends on the order of the instances returned by the {@link ServiceLoader}.
 * </p>
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class DefaultSecretResolverRegistry implements SecretResolverRegistry {
    private static final Logger logger = LogManager.getLogger(DefaultSecretResolverRegistry.class);
    
    private List<SecretResolver> resolvers = Lists.newArrayList();

    private Injector injector;

    @Inject
    public DefaultSecretResolverRegistry(Injector injector) {
        this.injector = injector;
    }
    
    /**
     * Load {@link SecretResolver} via {@link ServiceLoader}.
     * Note: this currently only checks the main class path, not in apps.
     */
    public void discoverResolvers() {
        int resolvers = 0;
        try {
            logger.info("Loading SecretResolvers via ServiceLoader");
            ServiceLoader<SecretResolver> loader = ServiceLoader.load(SecretResolver.class);
            for (SecretResolver resolver : loader) {
                addSecretResolver(resolver);
                resolvers++;
            }
        }
        catch (Exception e) {
            // only log a warning but do not abort
            logger.warn("Failed to load SecretResolver ({}. resolver): {}", Integer.valueOf(resolvers + 1), e.getMessage());
            logger.debug("Details:",  e);
        }
        
    }
    
    @Override
    public void addSecretResolver(SecretResolver resolver) {
        logger.debug("Adding SecretResolver {}", resolver);
        if (injector != null) {
            injector.injectMembers(resolver);
        }
        resolvers.add(resolver);
    }
    
    @Override
    public void removeSecretResolver(SecretResolver resolver) {
        logger.debug("Removing SecretResolver {}", resolver);
        resolvers.remove(resolver);
    }
    
    @Override
    public void removeAllSecretResolvers() {
        logger.debug("Removing all SecretResolver ({})", resolvers.size());
        resolvers.clear();
    }

    @Override
    public Iterator<SecretResolver> iterator() {
        return Iterators.unmodifiableIterator(resolvers.iterator());
    }

}
