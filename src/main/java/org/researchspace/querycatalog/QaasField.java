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

package org.researchspace.querycatalog;

import com.google.common.collect.ImmutableMap;

import java.util.HashMap;
import java.util.Map;

import org.researchspace.repository.RepositoryManager;

public enum QaasField {
    IRI("iri"), ACL("aclPermission", "*"), PUBLISHER("publisher"), RESPONSE_FORMAT("responseformat"),
    DISABLED("disabled", "false"), REPOSITORY("repository", RepositoryManager.DEFAULT_REPOSITORY_ID),
    MODIFIED("modified");

    public final String configKey;
    public final String defaultValue;

    QaasField(String configKey) {
        this(configKey, null);
    }

    QaasField(String configKey, String defaultValue) {
        this.configKey = configKey;
        this.defaultValue = defaultValue;
    }

    public static final Map<String, QaasField> byConfigKey;
    static {
        Map<String, QaasField> indexed = new HashMap<>();
        for (QaasField field : values()) {
            indexed.put(field.configKey, field);
        }
        byConfigKey = ImmutableMap.copyOf(indexed);
    }
}
