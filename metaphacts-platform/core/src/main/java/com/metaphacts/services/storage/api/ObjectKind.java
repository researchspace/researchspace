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

package com.metaphacts.services.storage.api;

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
