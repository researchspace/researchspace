/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.rest.endpoint;

import java.nio.charset.StandardCharsets;

import javax.annotation.Nullable;

import org.glassfish.jersey.media.multipart.FormDataContentDisposition;

/**
 * Recovers the UTF-8 file name from a {@code multipart/form-data} part.
 *
 * <p>
 * Jersey/mimepull hardcodes ISO-8859-1 for part headers, but browsers send the
 * file name as UTF-8 bytes (RFC 7578), so {@code "galería.png"} arrives as
 * {@code "galerÃ­a.png"}. We re-read those Latin-1 bytes as the UTF-8 they are.
 */
public final class MultipartFileNames {

    private MultipartFileNames() {
    }

    /** @return the decoded file name, or {@code null} if the part has none. */
    public static @Nullable String getFileName(@Nullable FormDataContentDisposition disposition) {
        if (disposition == null) {
            return null;
        }
        String name = disposition.getFileName();
        if (name == null) {
            return null;
        }
        return new String(name.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
    }
}
