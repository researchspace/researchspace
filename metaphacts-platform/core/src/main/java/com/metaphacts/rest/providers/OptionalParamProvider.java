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

package com.metaphacts.rest.providers;

import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.ext.ParamConverter;
import javax.ws.rs.ext.ParamConverterProvider;

import org.glassfish.hk2.api.ServiceLocator;
import org.glassfish.jersey.internal.inject.Providers;
import org.glassfish.jersey.internal.util.ReflectionHelper;
import org.glassfish.jersey.internal.util.collection.ClassTypePair;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
public class OptionalParamProvider implements ParamConverterProvider {

    private final ServiceLocator locator;

    @Inject
    public OptionalParamProvider(final ServiceLocator locator) {
        this.locator = locator;
    }

    @Override
    public <T> ParamConverter<T> getConverter(final Class<T> rawType, final Type genericType,
            final Annotation[] annotations) {
        if (rawType == Optional.class) {
            final List<ClassTypePair> ctps = ReflectionHelper.getTypeArgumentAndClass(genericType);
            ClassTypePair ctp = (ctps.size() == 1) ? ctps.get(0) : null;
            final Set<ParamConverterProvider> converterProviders = Providers.getProviders(locator,
                    ParamConverterProvider.class);
            for (ParamConverterProvider provider : converterProviders) {
                final ParamConverter<?> converter = provider.getConverter(ctp.rawClass(),
                        ctp.type(), annotations);
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