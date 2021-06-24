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

package org.researchspace.services.storage;

import org.apache.commons.io.IOUtils;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.StorageException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class StorageUtils {
    private StorageUtils() {
    }

    public static String readTextContent(ObjectRecord record) throws IOException {
        try (InputStream content = record.getLocation().readContent()) {
            return IOUtils.toString(content, StandardCharsets.UTF_8);
        }
    }

    public static void throwIfNonMutable(boolean isMutable) throws StorageException {
        if (!isMutable) {
            throw new StorageException("Cannot write to read-only storage");
        }
    }
}
