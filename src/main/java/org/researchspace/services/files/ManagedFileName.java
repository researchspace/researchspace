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

package org.researchspace.services.files;

import java.util.Objects;
import java.util.function.Supplier;
import java.util.regex.Pattern;

import javax.annotation.Nullable;

import org.researchspace.services.storage.api.StoragePath;

public final class ManagedFileName {
    private static final Pattern DISALLOWED_CHARACTERS = Pattern.compile("[^a-zA-Z0-9_.\\-\\p{L}]");
    private static final Pattern COLLAPSE_UNDERSCORES = Pattern.compile("_+");

    private StoragePath prefix;
    private String name;

    private ManagedFileName(StoragePath prefix, String name) {
        this.prefix = prefix;
        this.name = name;
    }

    public StoragePath getPrefix() {
        return prefix;
    }

    public String getName() {
        return name;
    }

    public static ManagedFileName generateFromFileName(StoragePath prefix, String fileName,
            @Nullable Supplier<String> sequenceGenerator) {
        String transformed = fileName;
        transformed = DISALLOWED_CHARACTERS.matcher(transformed).replaceAll("_");
        transformed = COLLAPSE_UNDERSCORES.matcher(transformed).replaceAll("_");

        if (sequenceGenerator != null) {
            String sequence = sequenceGenerator.get();
            transformed = sequence + "_" + transformed;
        }

        return new ManagedFileName(prefix, transformed);
    }

    public static ManagedFileName validate(StoragePath prefix, String name) {
        // if (DISALLOWED_CHARACTERS.matcher(name).find()) {
        // throw new IllegalArgumentException("Invalid managed file name \"" + name +
        // "\"");
        // }
        return new ManagedFileName(prefix, name);
    }

    public StoragePath toObjectId() {
        return prefix.resolve(name);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        ManagedFileName that = (ManagedFileName) o;
        return prefix.equals(that.prefix) && name.equals(that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(prefix, name);
    }

    @Override
    public String toString() {
        return "ManagedFileName(prefix: \"" + prefix + "\", name: \"" + name + "\")";
    }
}
