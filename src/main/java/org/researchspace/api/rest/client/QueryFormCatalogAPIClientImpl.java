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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.queryform.QueryFormConfiguration;
import org.researchspace.api.dto.querytemplate.AskQueryTemplate;
import org.researchspace.api.dto.querytemplate.ConstructQueryTemplate;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.querytemplate.SelectQueryTemplate;
import org.researchspace.api.transform.ModelToQueryFormConfigurationTransformer;

/**
 * Default implementation of {@link QueryCatalogAPIClient}.
 * 
 * @author msc, jt
 */
public class QueryFormCatalogAPIClientImpl extends AbstractLDPAPIDtoClientImpl<QueryFormConfiguration<QueryTemplate<?>>>
        implements QueryFormCatalogAPIClient {

    @Deprecated
    public QueryFormCatalogAPIClientImpl(final String endpoint, final String user, final String password,
            final IRI containerId, final IRI baseIri, final QueryTemplateCatalogAPIClient queryTemplateCatalogApi) {

        super(new RemoteLDPAPIClientImpl(endpoint, user, password, containerId, baseIri),
                new ModelToQueryFormConfigurationTransformer(queryTemplateCatalogApi));
    }

    @Override
    public List<QueryFormConfiguration<QueryTemplate<?>>> getFormConfigurations() throws APICallFailedException {

        return getFormConfigurations(null);

    }

    @Override
    public List<QueryFormConfiguration<SelectQueryTemplate>> getSelectBasedFormConfigurations()
            throws APICallFailedException {

        return getFormConfigurations(SelectQueryTemplate.class);

    }

    @Override
    public List<QueryFormConfiguration<ConstructQueryTemplate>> getConstructBasedFormConfigurations()
            throws APICallFailedException {

        return getFormConfigurations(ConstructQueryTemplate.class);

    }

    @Override
    public List<QueryFormConfiguration<AskQueryTemplate>> getAskBasedFormConfigurations()
            throws APICallFailedException {

        return getFormConfigurations(AskQueryTemplate.class);

    }

    @Override
    public QueryFormConfiguration<QueryTemplate<?>> getFormConfiguration(Resource formId)
            throws APICallFailedException {

        return getFormConfiguration(formId, null);

    }

    @Override
    public QueryFormConfiguration<SelectQueryTemplate> getSelectBasedFormConfiguration(Resource FormConfigurationId)
            throws APICallFailedException {

        return getFormConfiguration(FormConfigurationId, SelectQueryTemplate.class);

    }

    @Override
    public QueryFormConfiguration<ConstructQueryTemplate> getConstructBasedFormConfiguration(
            Resource FormConfigurationId) throws APICallFailedException {

        return getFormConfiguration(FormConfigurationId, ConstructQueryTemplate.class);

    }

    @Override
    public QueryFormConfiguration<AskQueryTemplate> getAskBasedFormConfiguration(Resource FormConfigurationId)
            throws APICallFailedException {

        return getFormConfiguration(FormConfigurationId, AskQueryTemplate.class);

    }

    /**
     * Helper method returning the form-based query instantiation config for the
     * given {@link IRI} if it satisfied the given backing query type (in case the
     * clazz parameter is null, no constraint is imposed).
     */
    @SuppressWarnings("unchecked")
    protected <T extends QueryTemplate<?>> QueryFormConfiguration<T> getFormConfiguration(Resource formConfigurationId,
            Class<T> clazz) throws APICallFailedException {

        try {

            final QueryFormConfiguration<QueryTemplate<?>> config = getObjectDto(formConfigurationId);
            if (clazz == null || clazz.isAssignableFrom(config.getQueryTemplate().getClass())) {
                return QueryFormConfiguration.class.cast(config);
            }

            return null; // fallback

        } catch (Exception e) {

            throw new APICallFailedException("Extraction of form configuration " + formConfigurationId + " of type "
                    + (clazz == null ? null : clazz.getSimpleName()) + " failed", e);
        }

    }

    /**
     * Helper method returning all form-based query instantiation configs for the
     * given backing query type (in case the clazz parameter is null, all configs
     * are returned, independently from the backing type).
     */
    public <T extends QueryTemplate<?>> List<QueryFormConfiguration<T>> getFormConfigurations(Class<T> clazzFilter)
            throws APICallFailedException {

        final List<QueryFormConfiguration<T>> uiForms = new LinkedList<QueryFormConfiguration<T>>();

        for (final Resource queryId : ldpAPIClient.getContainedObjects()) {

            final QueryFormConfiguration<T> uiFormDto = getFormConfiguration(queryId, clazzFilter);

            if (uiFormDto != null) {

                uiForms.add(uiFormDto);

            }
        }

        return uiForms;

    }

}