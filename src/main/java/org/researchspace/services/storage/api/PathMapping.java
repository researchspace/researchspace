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

package org.researchspace.services.storage.api;

import java.util.Optional;

/**
 * Represents file path mapping for storage implementations.
 *
 * <p>
 * This mapping allows to add flexibility when configuring implementations to
 * preserve backwards compatibility or limit access to specific paths.
 * </p>
 */
public abstract class PathMapping {
    /**
     * @return relative path to object with file extension at the end if applicable,
     *         e.g. "foo/bar/baz.html"
     */
    public abstract Optional<StoragePath> mapForward(StoragePath path);

    public abstract Optional<StoragePath> mapBack(StoragePath path);

    public static class Default extends PathMapping {
        @Override
        public Optional<StoragePath> mapForward(StoragePath path) {
            return Optional.of(path);
        }

        @Override
        public Optional<StoragePath> mapBack(StoragePath path) {
            return Optional.of(path);
        }
    }

    /**
     * Maps object paths from one path prefix to another.
     */
    public static class MapPrefix extends PathMapping {
        private final PathMapping base;
        private final StoragePath from;
        private final StoragePath to;

        public MapPrefix(PathMapping base, StoragePath from, StoragePath to) {
            this.base = base;
            this.from = from;
            this.to = to;
        }

        @Override
        public Optional<StoragePath> mapForward(StoragePath path) {
            return base.mapForward(path).flatMap(from::relativize).map(to::resolve);
        }

        @Override
        public Optional<StoragePath> mapBack(StoragePath path) {
            return to.relativize(path).map(from::resolve).flatMap(base::mapBack);
        }
    }
}
