/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.transform;

import org.researchspace.api.dto.queryform.QueryFormConfiguration;
import org.researchspace.api.dto.queryform.QueryFormElement;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.APIInitializationException;
import org.researchspace.api.rest.client.PlatformRestClient;

public class ClientTest {

    public static void main(String[] args) throws APIInitializationException, APICallFailedException {
        PlatformRestClient client = new PlatformRestClient("http://127.0.0.1:8888/", null, null);

        for (QueryFormConfiguration<QueryTemplate<?>> f : client.getQueryFormCatalogAPI().getFormConfigurations()) {
            System.out.println(f.getLabel());
            System.out.println(f.getDescription());
            System.out.println(f.getQueryTemplate().getQuery().getQueryString());
            for (QueryFormElement e : f.getQueryFormElements()) {
                System.out.println(e.getLabel());
                System.out.println(e.getDescription());
                System.out.println(e.getSuggestionQueryId());
                if (e.getSuggestionQueryId() != null)
                    System.out.println(client.getQueryCatalogAPI().getSelectQuery(e.getSuggestionQueryId()));
            }
        }
    }
}
