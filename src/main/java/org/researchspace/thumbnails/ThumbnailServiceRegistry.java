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

package org.researchspace.thumbnails;

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
            throw new IllegalStateException(String
                    .format("Attempt to register thumbnail service with already registered name %s", serviceName));
        } else {
            services.put(serviceName, service);
        }
    }

    public Optional<ThumbnailService> get(String serviceName) {
        return Optional.ofNullable(services.get(serviceName));
    }
}
