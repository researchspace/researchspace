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

package com.metaphacts.querycatalog;

import com.google.common.collect.ImmutableMap;
import com.metaphacts.repository.RepositoryManager;

import java.util.HashMap;
import java.util.Map;

public enum QaasField {
    IRI("iri"),
    ACL("aclPermission", "*"),
    PUBLISHER("publisher"),
    RESPONSE_FORMAT("responseformat"),
    DISABLED("disabled", "false"),
    REPOSITORY("repository", RepositoryManager.DEFAULT_REPOSITORY_ID),
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
