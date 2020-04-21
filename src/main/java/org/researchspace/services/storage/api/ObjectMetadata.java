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

    public ObjectMetadata() {
    }

    public ObjectMetadata(@Nullable String author, @Nullable Instant creationDate) {
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
     * <p>
     * This field is ignored when providing source metadata for new revision.
     * </p>
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
