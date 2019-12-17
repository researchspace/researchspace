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

package com.metaphacts.util;

import java.lang.reflect.Field;
import java.util.Optional;

/**
 * This class provides some utility methods for reflection.
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class ReflectionUtil {
    /**
     * Get value of specified field from provided instance. The field is found even if it is not public.
     * @param <T> target type of the field. The value will be casted to this type, using {@link Object} works for all types.
     * @param instance instance from whch to get the field value
     * @param name field name
     * @return field value
     * @throws NoSuchFieldException in case that the instance does not have a field of that name 
     * @throws IllegalAccessException if the field cannot be accessed
     * @throws IllegalArgumentException if the specified instance is not an instance of the appropriate class
     */
    public static <T> T getFieldValue(final Object instance, final String name) throws NoSuchFieldException, IllegalArgumentException, IllegalAccessException {
        Optional<Field> f = findField(instance.getClass(), name);
        if (!f.isPresent()) {
            throw new NoSuchFieldException("no such field: " + name);
        }
        Field field = f.get();
        field.setAccessible(true);
        @SuppressWarnings("unchecked")
        T value = (T) field.get(instance);
        return value;
    }

    /**
     * Find field within class or parent classes. The field is found even if it is not public.
     * @param clazz clazz to search
     * @param name field name
     * @return field or empty {@link Optional}
     */
    public static Optional<Field> findField(final Class<?> clazz, final String name) {
        try {
            Field field = clazz.getDeclaredField(name);
            return Optional.of(field);
        } catch (NoSuchFieldException e) {
            // try parent class
            Class<?> parent = clazz.getSuperclass();
            if (parent != null) {
                return findField(parent, name);
            }
        }
        return Optional.empty();
    }
}
