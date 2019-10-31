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

package com.metaphacts.config;

import org.apache.commons.lang.NullArgumentException;

import javax.annotation.Nullable;
import javax.validation.constraints.NotNull;
import java.util.Objects;

public class NamespaceRecord {
    private final String prefix;
    private final String iri;
    @Nullable
    private final String appId;

    public NamespaceRecord(String prefix, String iri) {
        this(prefix, iri, null);
    }

    public NamespaceRecord(String prefix, String iri, @Nullable String appId) {
        if (prefix == null) {
            throw new NullArgumentException("prefix");
        }
        if (iri == null) {
            throw new NullArgumentException("iri");
        }
        this.prefix = prefix;
        this.iri = iri;
        this.appId = appId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NamespaceRecord record = (NamespaceRecord) o;
        return Objects.equals(prefix, record.prefix) &&
            Objects.equals(iri, record.iri) &&
            Objects.equals(appId, record.appId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(prefix, iri, appId);
    }

    public String getPrefix() {
        return prefix;
    }

    public String getIri() {
        return iri;
    }

    @Nullable
    public String getAppId() {
        return appId;
    }
}
