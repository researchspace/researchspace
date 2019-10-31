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

import javax.annotation.Nullable;
import java.time.Instant;

/**
 * Represents metadata stored with object in {@link ObjectStorage}.
 */
public final class ObjectMetadata {
    @Nullable
    private String author;
    @Nullable
    private Instant creationDate;

    public ObjectMetadata() {}

    public ObjectMetadata(
        @Nullable String author,
        @Nullable Instant creationDate
    ) {
        this.author = author;
        this.creationDate = creationDate;
    }

    /**
     * Object author's username.
     */
    @Nullable
    public String getAuthor() {
        return author;
    }

    /**
     * Object revision creation date.
     *
     * <p>This field is ignored when providing source metadata for new revision.</p>
     */
    @Nullable
    public Instant getCreationDate() {
        return creationDate;
    }

    public ObjectMetadata withCurrentDate() {
        return new ObjectMetadata(author, Instant.now());
    }

    public static ObjectMetadata empty() {
        return new ObjectMetadata(null, null);
    }
}
