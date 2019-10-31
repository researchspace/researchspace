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

package com.metaphacts.services.files;

import com.metaphacts.services.storage.api.ObjectKind;
import com.metaphacts.services.storage.api.StoragePath;
import org.apache.commons.lang.StringUtils;

import javax.annotation.Nullable;
import java.util.Objects;
import java.util.function.Supplier;
import java.util.regex.Pattern;

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

    public static ManagedFileName generateFromFileName(
        StoragePath prefix,
        String fileName,
        @Nullable Supplier<String> sequenceGenerator
    ) {
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
        if (DISALLOWED_CHARACTERS.matcher(name).find()) {
            throw new IllegalArgumentException("Invalid managed file name \"" + name + "\"");
        }
        return new ManagedFileName(prefix, name);
    }

    public StoragePath toObjectId() {
        return prefix.resolve(name);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ManagedFileName that = (ManagedFileName) o;
        return prefix.equals(that.prefix) &&
            name.equals(that.name);
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
