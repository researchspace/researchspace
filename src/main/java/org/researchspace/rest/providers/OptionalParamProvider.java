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

package org.researchspace.rest.providers;

import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.ext.ParamConverter;
import javax.ws.rs.ext.ParamConverterProvider;

import org.glassfish.jersey.internal.inject.InjectionManager;
import org.glassfish.jersey.internal.inject.Providers;
import org.glassfish.jersey.internal.util.ReflectionHelper;
import org.glassfish.jersey.internal.util.collection.ClassTypePair;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
public class OptionalParamProvider implements ParamConverterProvider {

    private final InjectionManager manager;

    @Inject
    public OptionalParamProvider(final InjectionManager manager) {
        this.manager = manager;
    }

    @Override
    public <T> ParamConverter<T> getConverter(final Class<T> rawType, final Type genericType,
            final Annotation[] annotations) {
        if (rawType == Optional.class) {
            final List<ClassTypePair> ctps = ReflectionHelper.getTypeArgumentAndClass(genericType);
            ClassTypePair ctp = (ctps.size() == 1) ? ctps.get(0) : null;
            final Set<ParamConverterProvider> converterProviders = Providers.getProviders(manager,
                    ParamConverterProvider.class);
            for (ParamConverterProvider provider : converterProviders) {
                final ParamConverter<?> converter = provider.getConverter(ctp.rawClass(), ctp.type(), annotations);
                if (converter != null) {
                    return new ParamConverter<T>() {
                        @Override
                        public T fromString(final String value) {
                            if (value == null) {
                                return rawType.cast(Optional.empty());
                            }
                            return rawType.cast(Optional.ofNullable(converter.fromString(value)));
                        }

                        @Override
                        public String toString(final T value) throws IllegalArgumentException {
                            return value.toString();
                        }
                    };
                }
            }
        }

        return null;
    }
}