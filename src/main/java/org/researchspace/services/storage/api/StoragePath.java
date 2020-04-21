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

import com.google.common.base.Charsets;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.Optional;
import java.util.regex.Pattern;

public final class StoragePath {
    public static final String SEPARATOR = "/";

    public static final StoragePath EMPTY = new StoragePath("");

    /**
     * Disallowed path traversal components such as {@code .} or {@code ..}.
     */
    private static final Pattern NON_CANONICAL_PATH_FRAGMENT = Pattern.compile("[^/]\\.\\.?[/$]");
    /**
     * Disallowed empty path components such as {@code //}, {@code ///}, etc
     */
    private static final Pattern EMPTY_PATH_FRAGMENT = Pattern.compile("//");

    private final String path;

    private StoragePath(String path) {
        this.path = path;
    }

    public StoragePath resolve(String part) {
        StringBuilder builder = new StringBuilder();
        if (!isEmpty()) {
            builder.append(path);
            builder.append(SEPARATOR);
        }
        int start = part.startsWith(SEPARATOR) ? SEPARATOR.length() : 0;
        int end = part.length() - (part.endsWith(SEPARATOR) ? SEPARATOR.length() : 0);
        builder.append(part, start, end);
        String combinedPath = builder.toString();
        assertPathIsValid(combinedPath, true);
        return new StoragePath(combinedPath);
    }

    public StoragePath resolve(StoragePath other) {
        if (isEmpty()) {
            return other;
        } else if (other.isEmpty()) {
            return this;
        } else {
            return new StoragePath(this.path + SEPARATOR + other.path);
        }
    }

    /**
     * @throws IllegalArgumentException when path is not a valid path
     */
    public static StoragePath parse(String path) {
        assertPathIsValid(path, true);
        return new StoragePath(path);
    }

    public static Optional<StoragePath> tryParse(String path) {
        return assertPathIsValid(path, false) ? Optional.of(new StoragePath(path)) : Optional.empty();
    }

    public static boolean assertPathIsValid(String storagePath, boolean throwOnError) {
        if (storagePath.startsWith(SEPARATOR)) {
            if (!throwOnError) {
                return false;
            }
            throw new IllegalArgumentException("Storage path must not start with a separator: \"" + storagePath + "\"");
        }
        if (storagePath.endsWith(SEPARATOR)) {
            if (!throwOnError) {
                return false;
            }
            throw new IllegalArgumentException("Storage path must not end with a separator: \"" + storagePath + "\"");
        }
        if (NON_CANONICAL_PATH_FRAGMENT.matcher(storagePath).find()) {
            if (!throwOnError) {
                return false;
            }
            throw new IllegalArgumentException(
                    "Storage path must not contain non-canonical components \"" + storagePath + "\"");
        }
        if (EMPTY_PATH_FRAGMENT.matcher(storagePath).find()) {
            if (!throwOnError) {
                return false;
            }
            throw new IllegalArgumentException(
                    "Storage path must not contain empty components \"" + storagePath + "\"");
        }
        return true;
    }

    @Override
    public int hashCode() {
        return path.hashCode();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        StoragePath that = (StoragePath) o;
        return path.equals(that.path);
    }

    @Override
    public String toString() {
        return path;
    }

    public boolean isEmpty() {
        return path.isEmpty();
    }

    public boolean isPrefixOf(StoragePath subPath) {
        if (isEmpty()) {
            return true;
        }
        if (subPath.path.length() < path.length()) {
            return false;
        }
        return subPath.path.startsWith(path)
                && (subPath.path.length() == path.length() || subPath.path.startsWith(SEPARATOR, path.length()));
    }

    public Optional<StoragePath> relativize(StoragePath subPath) {
        if (isEmpty()) {
            return Optional.of(subPath);
        } else if (isPrefixOf(subPath)) {
            if (subPath.path.length() == path.length()) {
                return Optional.of(StoragePath.EMPTY);
            } else {
                String relativePath = subPath.path.substring(path.length() + SEPARATOR.length());
                return Optional.of(new StoragePath(relativePath));
            }
        } else {
            return Optional.empty();
        }
    }

    /**
     * @return parent of object path (before last separator), e.g.
     *         <ul>
     *         <li>"foo/bar/baz.html" -> "foo/bar"</li>
     *         <li>"baz" -> ""</li>
     *         <li>"" -> ""</li>
     *         </ul>
     */
    public StoragePath getParent() {
        int lastSeparatorIndex = path.lastIndexOf(SEPARATOR);
        if (lastSeparatorIndex < 0) {
            return StoragePath.EMPTY;
        }
        return new StoragePath(path.substring(0, lastSeparatorIndex));
    }

    public String getLastComponent() {
        int lastSeparatorIndex = path.lastIndexOf(SEPARATOR);
        return lastSeparatorIndex < 0 ? path : path.substring(lastSeparatorIndex + SEPARATOR.length());
    }

    /**
     * @param extension path extension; must starts with a period, e.g. ".html"
     */
    public StoragePath addExtension(String extension) {
        if (isEmpty()) {
            throw new IllegalArgumentException("Cannot add an extension to an empty path");
        }
        assertPathExtensionIsValid(extension);
        String withExtension = path + extension;
        assertPathIsValid(withExtension, true);
        return new StoragePath(withExtension);
    }

    public boolean hasExtension(String extension) {
        assertPathExtensionIsValid(extension);
        return path.endsWith(extension) && !path.equals(extension) && !path.endsWith(SEPARATOR + extension);
    }

    /**
     * @return path without file extension, e.g.
     *         <ul>
     *         <li>stripExtension("foo/baz.html", ".html") -> "foo/baz"</li>
     *         <li>stripExtension("foo/.png", ".png") -> "foo/.png"</li>
     *         <li>stripExtension("foo/baz", ".rar") -> "foo/baz"</li>
     *         </ul>
     */
    public StoragePath stripExtension(String extension) {
        if (!hasExtension(extension)) {
            return this;
        }
        return new StoragePath(path.substring(0, path.length() - extension.length()));
    }

    public static String removeAnyExtension(String component) {
        int lastDotIndex = component.lastIndexOf('.');
        int lastSeparatorIndex = component.lastIndexOf(SEPARATOR);
        if (lastDotIndex <= 0 || lastDotIndex < lastSeparatorIndex) {
            return component;
        }
        return component.substring(0, lastDotIndex);
    }

    private static void assertPathExtensionIsValid(String extension) {
        if (!extension.startsWith(".")) {
            throw new IllegalArgumentException("Path extension must start with a period: " + extension);
        }
        if (extension.contains(SEPARATOR)) {
            throw new IllegalArgumentException("Path extension must not contain a separator: " + extension);
        }
    }

    /**
     * @return canonical representation of specified IRI as object path
     */
    public static StoragePath encodeIri(IRI iri) {
        try {
            String path = URLEncoder.encode(iri.stringValue(), Charsets.UTF_8.name());
            assertPathIsValid(path, true);
            return new StoragePath(path);
        } catch (UnsupportedEncodingException ex) {
            throw new RuntimeException(ex);
        }
    }

    /**
     * @return IRI represented by specified object path
     * @throws IllegalArgumentException when object path is not a canonical
     *                                  representation of an IRI
     */
    public IRI decodeIri() {
        if (path.contains(SEPARATOR)) {
            throw new IllegalArgumentException("Cannot unescape IRI from a non-root path");
        }
        try {
            String decodedId = URLDecoder.decode(path, Charsets.UTF_8.name());
            ValueFactory vf = SimpleValueFactory.getInstance();
            return vf.createIRI(decodedId);
        } catch (UnsupportedEncodingException ex) {
            throw new RuntimeException(ex);
        }
    }
}
