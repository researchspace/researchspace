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

/**
 * Storage path prefixes for core objects types, e.g. "foo/folder"
 */
public final class ObjectKind {
    public static final StoragePath ASSET = StoragePath.parse("assets");
    public static final StoragePath TEMPLATE = StoragePath.parse("data/templates");
    public static final StoragePath LDP = StoragePath.parse("ldp");
    public static final StoragePath CONFIG = StoragePath.parse("config");
    public static final StoragePath FILE = StoragePath.parse("file");
}
