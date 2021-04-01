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

package org.researchspace.sail.rest;

import java.io.InputStream;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Map.Entry;

import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status.Family;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.SPL;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.glassfish.jersey.client.ClientProperties;
import org.researchspace.repository.MpRepositoryVocabulary;

import net.minidev.json.JSONObject;

/**
 * Abstract superclass for {@link SailConnection}s that wrap around REST APIs.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public abstract class AbstractRESTWrappingSailConnection<C extends AbstractRESTWrappingSailConfig>
        extends AbstractServiceWrappingSailConnection<C> {

    public AbstractRESTWrappingSailConnection(AbstractServiceWrappingSail<C> sailBase) {
        super(sailBase);
    }

    @Override
    protected abstract Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException;

    /**
     * Default implementation calling the API using an HTTP GET method. Parameters
     * are passed via URL. JSON expected as a result format.
     * 
     * @param parametersHolder
     * @return
     */
    protected Response submit(RESTParametersHolder parametersHolder) {
        try {
            WebTarget targetResource = this.getSail().getClient().target(getSail().getConfig().getUrl())
                    .property(ClientProperties.FOLLOW_REDIRECTS, Boolean.TRUE);
            for (Entry<String, String> entry : parametersHolder.getInputParameters().entrySet()) {
                targetResource = targetResource.queryParam(entry.getKey(), entry.getValue());
            }
            return targetResource.request(MediaType.TEXT_PLAIN).get();
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * Default implementation calling the API using a HTTP POST method. Parameters
     * are stored in JSON body.
     * 
     * @param parametersHolder
     * @return
     */
    protected Response submitPost(RESTParametersHolder parametersHolder) {
        try {
            String type = ((RESTSailConfig) getSail().getConfig()).getInputFormat();

            Object body = null;         

            // TODO extend to other input formats
            if (StringUtils.equals(type, MediaType.APPLICATION_JSON)) 
                body = getJsonBody(parametersHolder.getInputParameters());
        
            WebTarget targetResource = this.getSail().getClient().target(getSail().getConfig().getUrl())
                    .property(ClientProperties.FOLLOW_REDIRECTS, Boolean.TRUE);

            return targetResource.request(type).post(Entity.json(body));
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * 
     * @param inputParameters
     * @return
     */
    protected Object getJsonBody(Map<String, String> inputParameters) {

        Model model = getSail().getServiceDescriptor().getModel();
        JSONObject body = new JSONObject();
        
        for (Entry<String, String> entry : inputParameters.entrySet()) {
            String id = MpRepositoryVocabulary.NAMESPACE.concat("_").concat(entry.getKey());
            
            // Get input json path for each input element
            Optional<Value> jsonPath = model
                .filter(null, SPL.PREDICATE_PROPERTY , SimpleValueFactory.getInstance().createIRI(id))
                .stream()
                .map(Statement::getSubject)
                .map(sub -> model.filter(sub, MpRepositoryVocabulary.INPUT_JSON_PATH, null).stream().findFirst().orElse(null))
                .map(Statement::getObject)
                .findFirst();

            // Create the body based on JSON object input strings
            if (jsonPath.isPresent()) {
                String[] paths = jsonPath.get().stringValue().split("\\.");
                int i = 0;

                JSONObject parent = body;

                while (i < paths.length-1) {
                    String key = paths[i++];
                    parent = (parent.containsKey(key)) ? (JSONObject)parent.get(key) : new JSONObject();
                    body.put(key, parent);
                }
                parent.put(paths[i], entry.getValue());
            }
        }
        return body;
    }

    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> executeAndConvertResultsToBindingSet(
            RESTParametersHolder parametersHolder) {
        Response response = submit(parametersHolder);
        if (!response.getStatusInfo().getFamily().equals(Family.SUCCESSFUL)) {
            throw new SailException("Request failed with HTTP status code " + response.getStatus() + ": "
                    + response.getStatusInfo().getReasonPhrase());
        }
        InputStream resultStream;

        resultStream = (InputStream) response.getEntity();
        return new CollectionIteration<BindingSet, QueryEvaluationException>(
                convertStream2BindingSets(resultStream, parametersHolder));
    }

}
