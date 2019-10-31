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

package com.metaphacts.templates;

import com.google.common.collect.ImmutableList;
import com.google.inject.Singleton;
import com.metaphacts.cache.QueryTemplateCache;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.services.fields.FieldDefinitionManager;
import com.metaphacts.services.fields.FieldsBasedSearch;
import com.metaphacts.templates.helper.*;

import javax.inject.Inject;
import java.util.List;

@Singleton
public class HandlebarsHelperRegistry {
    private List<Object> helpers;

    @Inject
    public HandlebarsHelperRegistry(
        RepositoryManager repositoryManager,
        FieldDefinitionManager fieldDefinitionManager,
        FieldsBasedSearch fieldsBasedSearch,
        QueryTemplateCache queryTemplateCache,
        LabelCache labelCache
    ) {
        this.helpers = ImmutableList.of(
            new AskHelperSource(),
            new HasPermissionHelperSource(),
            new UrlParamHelperSource(),
            new SingleValueFromSelectSource(),
            new SparqlHelperSource(queryTemplateCache),
            new JsonFromSparqlSelectSource(),
            new FieldDefinitionSource(repositoryManager, fieldDefinitionManager, fieldsBasedSearch, labelCache),
            new PrefixResolverHelperSource(),
            new SetManagementHelperSource(),
            new IsRepositoryTypeHelperSource(repositoryManager),
            new UriComponentHelperSource(),
            new DateTimeHelperSource()
        );
    }

    public List<Object> getHelpers() {
        return this.helpers;
    }
}
