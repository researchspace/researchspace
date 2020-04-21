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

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.querytemplate.AskQueryTemplate;
import org.researchspace.api.dto.querytemplate.ConstructQueryTemplate;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.querytemplate.SelectQueryTemplate;
import org.researchspace.api.dto.querytemplate.UpdateQueryTemplate;
import org.researchspace.api.transform.InvalidModelException;
import org.researchspace.api.transform.ModelToQueryTemplateTransformer;
import org.eclipse.rdf4j.model.IRI;

/**
 * Default implementation of {@link QueryCatalogAPIClient}.
 * 
 * @author msc
 */
public class QueryTemplateCatalogAPIClientImpl extends AbstractLDPAPIDtoClientImpl<QueryTemplate<?>>
        implements QueryTemplateCatalogAPIClient {

    /**
     * Constructor creating a new remote LDP API client. A preferable way is to pass
     * LDPAPIClient as a parameter.
     * 
     * @param endpoint
     * @param user
     * @param password
     * @param containerId
     * @param baseIri
     * @param queryCatalogApi
     */
    @Deprecated
    public QueryTemplateCatalogAPIClientImpl(final String endpoint, final String user, final String password,
            final IRI containerId, final IRI baseIri, final QueryCatalogAPIClient queryCatalogApi) {

        super(new RemoteLDPAPIClientImpl(endpoint, user, password, containerId, baseIri),
                new ModelToQueryTemplateTransformer(queryCatalogApi));
    }

    public QueryTemplateCatalogAPIClientImpl(final LDPAPIClient ldpAPIClient,
            final QueryCatalogAPIClient queryCatalogApi) {
        super(ldpAPIClient, new ModelToQueryTemplateTransformer(queryCatalogApi));
    }

    @Override
    public List<QueryTemplate<?>> getQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(null);
    }

    @Override
    public List<SelectQueryTemplate> getSelectQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(SelectQueryTemplate.class);
    }

    @Override
    public List<AskQueryTemplate> getAskQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(AskQueryTemplate.class);
    }

    @Override
    public List<ConstructQueryTemplate> getConstructQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(ConstructQueryTemplate.class);
    }

    @Override
    public List<UpdateQueryTemplate> getUpdateQueryTemplates() throws APICallFailedException {
        return getQueriesOfType(UpdateQueryTemplate.class);
    }

    @Override
    public QueryTemplate<?> getQueryTemplate(Resource queryId) throws APICallFailedException {

        try {

            return getObjectDto(queryId);

        } catch (InvalidModelException e) {

            throw new APICallFailedException("Extraction of template query " + queryId + " from API failed", e);

        }
    }

    @Override
    public SelectQueryTemplate getSelectQueryTemplate(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, SelectQueryTemplate.class);
    }

    @Override
    public AskQueryTemplate getAskQueryTemplate(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, AskQueryTemplate.class);
    }

    @Override
    public ConstructQueryTemplate getConstructQueryTemplate(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, ConstructQueryTemplate.class);
    }

    @Override
    public UpdateQueryTemplate getUpdateQueryTemplate(Resource queryId) throws APICallFailedException {
        return getQueryOfType(queryId, UpdateQueryTemplate.class);
    }

    @SuppressWarnings("unchecked")
    protected <T extends QueryTemplate<?>> List<T> getQueriesOfType(Class<T> clazzFilter)
            throws APICallFailedException {

        final List<T> queries = new LinkedList<T>();

        for (final Resource queryId : ldpAPIClient.getContainedObjects()) {

            try {
                final QueryTemplate<?> queryDto = getObjectDto(queryId);

                if (queryDto != null) {

                    if (clazzFilter == null || clazzFilter.isAssignableFrom(queryDto.getClass())) {

                        queries.add((T) queryDto);
                    }
                }

            } catch (Exception e) {

                throw new APICallFailedException(
                        "Extraction of template query " + queryId + " of class "
                                + (clazzFilter == null ? "null" : clazzFilter.getClass().getSimpleName()) + " failed",
                        e);

            }

        }

        return queries;
    }

    @SuppressWarnings("unchecked")
    protected <T extends QueryTemplate<?>> T getQueryOfType(Resource queryId, Class<T> clazz)
            throws APICallFailedException {

        try {

            final QueryTemplate<?> queryDto = getObjectDto(queryId);

            return clazz.isAssignableFrom(queryDto.getClass()) ? (T) queryDto : null;

        } catch (Exception e) {

            throw new APICallFailedException("Extraction of template query " + queryId + " of class "
                    + (clazz == null ? "null" : clazz.getClass().getSimpleName()) + " failed", e);
        }
    }

}