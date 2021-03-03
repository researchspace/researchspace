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
import java.util.Map.Entry;

import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status.Family;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.glassfish.jersey.client.ClientProperties;

import com.google.common.collect.Maps;

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

            Map<String, String> body = Maps.newHashMap();
            WebTarget targetResource = this.getSail().getClient().target(getSail().getConfig().getUrl())
                    .property(ClientProperties.FOLLOW_REDIRECTS, Boolean.TRUE);
            for (Entry<String, String> entry : parametersHolder.getInputParameters().entrySet()) {
                body.put(entry.getKey(), entry.getValue());
            }
            return targetResource.request(MediaType.TEXT_PLAIN).post(Entity.json(body));
        } catch (Exception e) {
            throw new SailException(e);
        }
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
