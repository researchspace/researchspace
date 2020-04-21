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

package org.researchspace.config;

import org.apache.commons.lang.NullArgumentException;

import javax.annotation.Nullable;
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
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        NamespaceRecord record = (NamespaceRecord) o;
        return Objects.equals(prefix, record.prefix) && Objects.equals(iri, record.iri)
                && Objects.equals(appId, record.appId);
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
