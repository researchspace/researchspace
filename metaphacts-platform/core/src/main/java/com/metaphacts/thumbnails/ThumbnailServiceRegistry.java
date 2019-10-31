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

package com.metaphacts.thumbnails;

import com.google.inject.Singleton;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * @author Alexey Morozov
 */
@Singleton
public class ThumbnailServiceRegistry {
    private Map<String, ThumbnailService> services = new HashMap<>();

    public void register(ThumbnailService service) {
        String serviceName = service.getThumbnailServiceName();
        if (services.containsKey(serviceName)) {
            throw new IllegalStateException(String.format(
                "Attempt to register thumbnail service with already registered name %s", serviceName));
        } else {
            services.put(serviceName, service);
        }
    }

    public Optional<ThumbnailService> get(String serviceName) {
        return Optional.ofNullable(services.get(serviceName));
    }
}
