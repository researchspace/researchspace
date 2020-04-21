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

import java.util.List;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.querytemplate.AskQueryTemplate;
import org.researchspace.api.dto.querytemplate.ConstructQueryTemplate;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.querytemplate.SelectQueryTemplate;
import org.researchspace.api.dto.querytemplate.UpdateQueryTemplate;

/**
 * API for QueryTemplate catalog functionality, providing convenient access to
 * stored queries and CRUD operations.
 *
 * @author msc
 */
public interface QueryTemplateCatalogAPIClient extends LDPAPIDtoClient<QueryTemplate<?>> {

    /**
     * Return all templates registered in the platform.
     */
    public List<QueryTemplate<?>> getQueryTemplates() throws APICallFailedException;

    /**
     * Retrun all SELECT templates registered in the platform.
     */
    public List<SelectQueryTemplate> getSelectQueryTemplates() throws APICallFailedException;

    /**
     * Return all ASK templates registered in the platform.
     */
    public List<AskQueryTemplate> getAskQueryTemplates() throws APICallFailedException;

    /**
     * Return all CONSTRUCT templates registered in the platform.
     */
    public List<ConstructQueryTemplate> getConstructQueryTemplates() throws APICallFailedException;

    /**
     * Return all UPDATE templates registered in the platform.
     */
    public List<UpdateQueryTemplate> getUpdateQueryTemplates() throws APICallFailedException;

    /**
     * Returns the QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not
     *         reflect a query
     */
    public QueryTemplate<?> getQueryTemplate(Resource queryId) throws APICallFailedException;

    /**
     * Returns the SELECT QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not
     *         reflect a SELECT query
     */
    public SelectQueryTemplate getSelectQueryTemplate(Resource queryId) throws APICallFailedException;

    /**
     * Returns the ASK QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not
     *         reflect an ASK query
     */
    public AskQueryTemplate getAskQueryTemplate(Resource queryId) throws APICallFailedException;

    /**
     * Returns the CONSTRUCT QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not
     *         reflect an CONSTRUCT query
     */
    public ConstructQueryTemplate getConstructQueryTemplate(Resource queryId) throws APICallFailedException;

    /**
     * Returns the UPDATE QueryTemplate with the given {@link IRI}.
     *
     * @param queryId the templates's ID
     * @return the QueryTemplate or null if the ID could not be resolved or does not
     *         reflect an UPDATE query
     */
    public UpdateQueryTemplate getUpdateQueryTemplate(Resource queryId) throws APICallFailedException;

    // TODO: more to add here (add, remove, etc.)
}
