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
import java.util.ServiceLoader;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * Default implementation of a {@link SecretsStore} which delegates to all
 * registered {@link SecretResolver}s. {@link SecretResolver}s can be registered
 * manually or are found via the {@link ServiceLoader}
 * 
 * <p>
 * Note: discovered {@link SecretResolver} have no particular ordering, the
 * order may be different on repeated invocations and depends on the order of
 * the instances returned by the {@link ServiceLoader}.
 * </p>
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class DefaultSecretsStore extends DefaultSecretResolverRegistry implements SecretsStore {
    private static final Logger logger = LogManager.getLogger(DefaultSecretsStore.class);

    @Inject
    public DefaultSecretsStore(Injector injector) {
        super(injector);
        discoverResolvers();
    }

    @Override
    public Optional<Secret> resolveSecret(SecretLookup lookup) {
        for (SecretResolver secretResolver : this) {
            try {
                Optional<Secret> result = secretResolver.resolveSecret(lookup);
                if (result.isPresent()) {
                    return result;
                }
            } catch (Exception e) {
                // log exception and try the next resolver
                logger.warn("Failed to resolve secret: " + e.getMessage());
                logger.debug("Details: ", e);
            }
        }
        return lookup.getFallbackValue().map(s -> Secret.fromString(s));
    }

}
