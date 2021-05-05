/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;

import javax.ws.rs.HttpMethod;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.Invocation;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status.Family;

import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SPL;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.glassfish.jersey.client.ClientProperties;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import com.jayway.jsonpath.ReadContext;

import net.minidev.json.JSONArray;
import net.minidev.json.JSONObject;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */
public class RESTSailConnection extends AbstractServiceWrappingSailConnection<RESTSailConfig> {

    private static final String JSON = "JSON";

    private static final Logger logger = LogManager.getLogger(RESTSailConnection.class);
    protected static final ValueFactory VF = SimpleValueFactory.getInstance();

    private Client client;
    private Configuration jsonPathConfig;

    public RESTSailConnection(RESTSail sailBase) {
        super(sailBase);
        this.client = sailBase.getClient();

        // configure JsonPath to not throw exception on missing path, instead return
        // null
        this.jsonPathConfig = Configuration.defaultConfiguration().addOptions(Option.SUPPRESS_EXCEPTIONS);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            ServiceParametersHolder parametersHolder) throws SailException {

        logger.trace("REST Response received");

        List<BindingSet> results = Lists.newArrayList();

        try {
            String stringResponse = IOUtils.toString(inputStream, StandardCharsets.UTF_8.name());

            // TODO: check the string format and call the right type. E.g., json or XML
            String type = JSON;

            logger.trace("REST Response type is {}", type);
            switch (type) {
            case JSON:

                // Get the root path
                Optional<Parameter> param = getSail().getSubjectParameter();
                String rootPath = param.isPresent() ? param.get().getJsonPath() : "$";

                results = executeJson(stringResponse, rootPath, parametersHolder.getOutputVariables());
                break;

            default:
                break;
            }

            return results;
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * 
     * @param res
     * @param rootPath
     * @param outputParameters
     * @return
     */
    private List<BindingSet> executeJson(String res, String rootPath, Map<IRI, String> outputParameters) {

        // Parse the response
        ReadContext context = JsonPath.parse(res);

        // Get the root object
        Object root = context.read(rootPath);

        List<BindingSet> results = Lists.newArrayList();

        // Manipulate the results in different ways based on its structure
        if (root instanceof JSONArray) {
            results = iterateJsonArray((JSONArray) root, outputParameters);
        }

        if (root instanceof Map) {
            results = iterateJsonMap((Map) root, outputParameters);
        }

        return results;
    }

    /**
     * 
     * @param array
     * @param outputParameters
     * @return
     */
    private List<BindingSet> iterateJsonArray(JSONArray array, Map<IRI, String> outputParameters) {

        logger.trace("### [START] Parsing JSONArray ###");
        List<BindingSet> bindingSets = Lists.newArrayList();

        for (Object object : array) {
            bindingSets.add(createBindingSetFromJSONObject(object, outputParameters));
        }

        logger.trace("### [END] Parsing JSONArray");
        return bindingSets;
    }

    /**
     * 
     * @param map
     * @param outputParameters
     * @return
     */
    private List<BindingSet> iterateJsonMap(Map map, Map<IRI, String> outputParameters) {

        logger.trace("### [START] Parsing JSONObject ###");
        List<BindingSet> bindingSets = Lists.newArrayList();

        bindingSets.add(createBindingSetFromJSONObject(map, outputParameters));

        logger.trace("### [END] Parsing JSONObject ###");
        return bindingSets;
    }

    /**
     * 
     * @param object
     * @param outputParameters
     * @return
     */
    private MapBindingSet createBindingSetFromJSONObject(Object object, Map<IRI, String> outputParameters) {
        MapBindingSet mapBindingSet = new MapBindingSet();

        for (Map.Entry<IRI, String> outputParameter : outputParameters.entrySet()) {
            Parameter parameter = getSail().getServiceDescriptor().getOutputParameters()
                    .get(outputParameter.getKey().getLocalName());
            IRI type = parameter.getValueType();
            String jsonPath = parameter.getJsonPath();
            String value = JsonPath.using(this.jsonPathConfig).parse(object).read(jsonPath);
            if (value != null) {
                if (StringUtils.equals(type.stringValue(), RDFS.RESOURCE.stringValue())) {
                    logger.trace("Creating Resource ({})", value);
                    mapBindingSet.addBinding(outputParameter.getValue(), VF.createIRI(value));
                } else {
                    logger.trace("Creating Literal({},{})", value, type);
                    mapBindingSet.addBinding(outputParameter.getValue(), VF.createLiteral(value, type));
                }
            }
        }

        return mapBindingSet;
    }

    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> executeAndConvertResultsToBindingSet(
            ServiceParametersHolder parametersHolder) {
        Response response = submit(parametersHolder);
        if (!response.getStatusInfo().getFamily().equals(Family.SUCCESSFUL)) {
            throw new SailException("Request failed with HTTP status code " + response.getStatus() + ": "
                    + response.getStatusInfo().getReasonPhrase());
        }
        InputStream resultStream = (InputStream) response.getEntity();
        return new CollectionIteration<BindingSet, QueryEvaluationException>(
                convertStream2BindingSets(resultStream, parametersHolder));
    }

    protected Response submit(ServiceParametersHolder parametersHolder) {

        try {
            String httpMethod = getSail().getConfig().getHttpMethod();
            logger.trace("Creating request with HTTP METHOD: {}", httpMethod);

            // Create request
            WebTarget targetResource = this.client.target(getSail().getConfig().getUrl())
                    .property(ClientProperties.FOLLOW_REDIRECTS, Boolean.TRUE);

            // Case with POST
            if (HttpMethod.POST.equals(httpMethod)) {
                return submitPost(targetResource, parametersHolder);
            } else {
                // Default case as GET
                return submitGet(targetResource, parametersHolder);
            }

        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    protected Response submitGet(WebTarget targetResource, ServiceParametersHolder parametersHolder) {
        try {
            for (Entry<String, String> entry : parametersHolder.getInputParameters().entrySet()) {
                targetResource = targetResource.queryParam(entry.getKey(), entry.getValue());
            }

            Invocation.Builder request = targetResource.request();
            return this.addHTTPHeaders(request).get();
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    protected Response submitPost(WebTarget targetResource, ServiceParametersHolder parametersHolder) {
        try {
            Invocation.Builder request = targetResource.request();
            request = this.addHTTPHeaders(request);

            String contentType = getSail().getConfig().getInputFormat();

            logger.trace("Submitting POST request");
            if (StringUtils.equals(contentType, MediaType.APPLICATION_JSON)) {
                Object body = getJsonBody(parametersHolder.getInputParameters());
                return request.post(Entity.json(body));
            } else {
                throw new IllegalArgumentException("RESTSail doesn't support input type: " + contentType);
            }
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    private Invocation.Builder addHTTPHeaders(Invocation.Builder request) {
        request.accept(getSail().getConfig().getMediaType());

        // Add additional HTTP headers if found
        Map<String, String> httpHeaders = this.getSail().getConfig().getHttpHeaders();
        if (httpHeaders.size() > 0) {
            logger.trace("Found {} custom HTTP headers.", httpHeaders.size());

            for (Map.Entry<String, String> header : httpHeaders.entrySet()) {
                request.header(header.getKey(), header.getValue());
            }
        }
        return request;
    }

    @Override
    protected ServiceParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns)
            throws SailException {

        logger.trace("[START] Parsing SPARQL query");

        ServiceParametersHolder res = new ServiceParametersHolder();

        // Iterate over input triples in descriptor
        // Use the SPARQL query to get values and create input parameter holder as a set
        // of tuple IRI, value
        for (Map.Entry<IRI, Parameter> entry : getSail().getMapInputParametersByProperty().entrySet()) {

            // Get subject and value
            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Value> value = RESTWrappingSailUtils.getObjectInputParameter(stmtPatterns, subject.orElse(null),
                    entry.getKey());

            // Add value from query or default value
            value = value.isPresent() ? value : entry.getValue().getDefaultValue();
            if (value.isPresent()) {
                logger.trace("Input value detected");
                logger.trace("Parameter: {}", entry.getValue().getParameterName());
                logger.trace("Value: {}", value.get());
                res.getInputParameters().put(entry.getValue().getParameterName(), value.get().stringValue());
            }
        }

        for (Map.Entry<IRI, Parameter> entry : getSail().getMapOutputParametersByProperty().entrySet()) {

            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Var> value = RESTWrappingSailUtils.getObjectOutputVariable(stmtPatterns, subject.orElse(null),
                    entry.getKey());

            if (value.isPresent()) {
                logger.trace("Output value detected");
                logger.trace("IRI: {}", entry.getKey());
                logger.trace("Name: {}", value.get().getName());
                res.getOutputVariables().put(entry.getKey(), value.get().getName());
            }
        }
        logger.trace("[END] Parsing SPARLQ query");

        return res;
    }

    /**
     * 
     * @param inputParameters
     * @return
     */
    protected Object getJsonBody(Map<String, String> inputParameters) {

        logger.trace("### [START] Creating input body JSON ###");

        Model model = getSail().getServiceDescriptor().getModel();
        JSONObject body = new JSONObject();

        for (Entry<String, String> entry : inputParameters.entrySet()) {
            String id = MpRepositoryVocabulary.NAMESPACE.concat("_").concat(entry.getKey());

            logger.trace("------");
            logger.trace("Parameter detected");
            logger.trace("Name: {}", entry.getKey());

            // Get input json path for each input element
            Optional<Value> jsonPath = model
                    .filter(null, SPL.PREDICATE_PROPERTY, SimpleValueFactory.getInstance().createIRI(id)).stream()
                    .map(Statement::getSubject)
                    .map(sub -> model.filter(sub, MpRepositoryVocabulary.INPUT_JSON_PATH, null).stream().findFirst()
                            .orElse(null))
                    .map(Statement::getObject).findFirst();

            // Create the body based on JSON object input strings
            if (jsonPath.isPresent()) {
                String[] paths = jsonPath.get().stringValue().split("\\.");
                int i = 0;

                logger.trace("JSON path: {}", jsonPath.get());

                JSONObject parent = body;

                while (i < paths.length - 1) {
                    String key = paths[i++];
                    parent = (parent.containsKey(key)) ? (JSONObject) parent.get(key) : new JSONObject();
                    body.put(key, parent);
                }

                parent.put(paths[i], entry.getValue());
            }
        }
        logger.trace("### [END] Creating input body JSON ###");
        return body;
    }
}
