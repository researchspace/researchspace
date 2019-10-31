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

package com.metaphacts.services.storage;

import com.metaphacts.services.storage.api.ObjectRecord;
import com.metaphacts.services.storage.api.StorageException;
import org.apache.commons.io.IOUtils;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

public final class StorageUtils {
    private StorageUtils() {}

    public static String readTextContent(ObjectRecord record) throws IOException {
        try (InputStream content = record.getLocation().readContent()) {
            return IOUtils.toString(content, StandardCharsets.UTF_8);
        }
    }

    public static Optional<String> currentUsername() {
        Subject subject = SecurityUtils.getSubject();
        Object principal = subject.getPrincipal();
        return principal == null ? Optional.empty() : Optional.of(principal.toString());
    }

    public static void throwIfNonMutable(boolean isMutable) throws StorageException {
        if (!isMutable) {
            throw new StorageException("Cannot write to read-only storage");
        }
    }
}
