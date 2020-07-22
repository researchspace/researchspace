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
package org.researchspace.api.rest.client;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * Entry point providing singleton access to the platform's REST API clients.
 * 
 * @author msc
 */
public class PlatformRestClient {

    // endpoint base URL
    private String baseUrl;

    // for now, the URL of the SPARQL endpoint is hardcoded
    private static final String SPARQL_ENDPOINT_SUFFIX = "/sparql";

    public final static String BASE_IRI_STR = "http://www.researchspace.org/";
    private final ValueFactory vf = SimpleValueFactory.getInstance();
    public final IRI BASE_IRI = vf.createIRI(BASE_IRI_STR);

    private final IRI LDP_CONTAINER_QUERY_CATALOG = vf
            .createIRI("http://www.researchspace.org/resource/system/queryCatalog");

    private final IRI LDP_CONTAINER_QUERY_TEMPLATE_CATALOG = vf
            .createIRI("http://www.researchspace.org/resource/system/queryTemplateCatalog");

    private final IRI LDP_CONTAINER_QUERY_FORM_CATALOG = vf
            .createIRI("http://www.researchspace.org/resource/system/queryFormCatalog");

    // convenient access to the SPARQL endpoint
    private SPARQLEndpointAPIClient sparqlEndpointApi;

    // access to the query catalog API
    private QueryCatalogAPIClient queryCatalogApi;

    private QueryTemplateCatalogAPIClient queryTemplateCatalogApi;

    // access to the form-based query instantiation catalog API
    private QueryFormCatalogAPIClient queryFormCatalogApi;

    public PlatformRestClient(String baseUrl, final String user, final String password)
            throws APIInitializationException {

        if (baseUrl == null || baseUrl.isEmpty()) {
            throw new APIInitializationException("Endpoint URL null or empty", null);
        }

        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        // in the following, initialize the APIs in valid order
        sparqlEndpointApi = new SPARQLEndpointAPIClientImpl(this.baseUrl + SPARQL_ENDPOINT_SUFFIX, user, password);

        queryCatalogApi = new QueryCatalogAPIClientImpl(this.baseUrl, user, password, LDP_CONTAINER_QUERY_CATALOG,
                BASE_IRI);

        queryTemplateCatalogApi = new QueryTemplateCatalogAPIClientImpl(this.baseUrl, user, password,
                LDP_CONTAINER_QUERY_TEMPLATE_CATALOG, BASE_IRI, queryCatalogApi);

        queryFormCatalogApi = new QueryFormCatalogAPIClientImpl(this.baseUrl, user, password,
                LDP_CONTAINER_QUERY_FORM_CATALOG, BASE_IRI, queryTemplateCatalogApi);
    }

    public QueryCatalogAPIClient getQueryCatalogAPI() {
        return queryCatalogApi;
    }

    public QueryFormCatalogAPIClient getQueryFormCatalogAPI() {
        return queryFormCatalogApi;
    }

    public SPARQLEndpointAPIClient getSparqlEndpointAPI() {
        return sparqlEndpointApi;
    }
}
