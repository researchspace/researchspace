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

package org.researchspace.templates;

import com.google.common.collect.ImmutableList;
import com.google.inject.Singleton;

import javax.inject.Inject;

import org.researchspace.cache.LabelCache;
import org.researchspace.cache.QueryTemplateCache;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.fields.FieldsBasedSearch;
import org.researchspace.templates.helper.*;

import java.util.List;

@Singleton
public class HandlebarsHelperRegistry {
    private List<Object> helpers;

    @Inject
    public HandlebarsHelperRegistry(RepositoryManager repositoryManager, FieldDefinitionManager fieldDefinitionManager,
            FieldsBasedSearch fieldsBasedSearch, QueryTemplateCache queryTemplateCache, LabelCache labelCache) {
        this.helpers = ImmutableList.of(new AskHelperSource(), new HasPermissionHelperSource(),
                new UrlParamHelperSource(), new SingleValueFromSelectSource(),
                new SparqlHelperSource(queryTemplateCache), new JsonFromSparqlSelectSource(),
                new FieldDefinitionSource(repositoryManager, fieldDefinitionManager, fieldsBasedSearch, labelCache),
                new PrefixResolverHelperSource(), new SetManagementHelperSource(),
                new IsRepositoryTypeHelperSource(repositoryManager), new UriComponentHelperSource(),
                new DateTimeHelperSource(), new AutoincrementValueSource());
    }

    public List<Object> getHelpers() {
        return this.helpers;
    }
}
