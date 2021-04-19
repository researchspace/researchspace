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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.ws.rs.HttpMethod;
import javax.ws.rs.core.Response;

import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SPL;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.query.Binding;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import com.jayway.jsonpath.ReadContext;

import net.minidev.json.JSONArray;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class RESTSailConnection extends AbstractRESTWrappingSailConnection<RESTSailConfig> {

    private static final String JSON = "JSON";
    String message = "------";

    private static final Logger logger = LogManager.getLogger(RESTSailConnection.class);
    protected static final ValueFactory VF = (ValueFactory) SimpleValueFactory.getInstance();

    public RESTSailConnection(AbstractServiceWrappingSail<RESTSailConfig> sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {

        logger.trace("REST Response received");

        List<BindingSet> results = Lists.newArrayList();

        try {
            String stringResponse = IOUtils.toString(inputStream, StandardCharsets.UTF_8.name());
            Model model = getSail().getServiceDescriptor().getModel();

            // TODO: check the string format and call the right type. E.g., json or XML
            String type = JSON;

            logger.trace("REST Response type is "+type);

            switch (type) {
            case JSON:
                // Get a list of output variable names and their json paths
                Map<String, String> jsonPaths = getJsonPaths(parametersHolder.getOutputVariables(), model);

                // Get the root path
                Optional<Parameter> param = getSail().getSubjectParameter();
                String rootPath = param.isPresent() ? getJsonPath(param.get(), model) : "$";

                results = executeJson(stringResponse, jsonPaths, rootPath);
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
     * @param parametersHolder
     * @param model
     */
    private List<BindingSet> executeJson(String res, Map<String, String> jsonPaths, String rootPath) {

        // Parse the response
        ReadContext context = JsonPath.parse(res);

        // Get the root object
        Object root = context.read(rootPath);

        List<BindingSet> results = Lists.newArrayList();

        // Manipulate the results in different ways based on its structure
        if (root instanceof JSONArray)
            results = iterateJsonArray((JSONArray) root, jsonPaths);

        if (root instanceof Map)
            results = iterateJsonMap((Map) root, jsonPaths);

        return results;
    }

    /**
     * 
     * @param array
     * @param outputVariables
     * @param model
     * @return
     */
    private List<BindingSet> iterateJsonArray(JSONArray array, Map<String, String> jsonPaths) {

        logger.trace("### [START] Parsing JSONArray ###");
        List<BindingSet> bindingSets = Lists.newArrayList();

        // Iterate over each object in JSONArray and evaluate its
        for (Object object : array) {
            MapBindingSet mapBindingSet = new MapBindingSet();

            // Evaluate each jsonPath singularly and add the result to the binding
            for (Map.Entry<String, String> path : jsonPaths.entrySet()) {

                logger.trace(message);
                logger.trace("Parsing " + path.getValue());

                try {
                    Optional<Value> type = getType(getSail().getServiceDescriptor().getModel(), MpRepositoryVocabulary.NAMESPACE.concat("_").concat(path.getKey()));
                    String value = JsonPath.read(object, path.getValue()).toString();
    
                    // If there is type check if it is a resource or a literal
                    if(type.isPresent()) {
    
                        IRI iriType = VF.createIRI(type.get().stringValue());
    
                        if(StringUtils.equals(iriType.stringValue() , RDFS.RESOURCE.stringValue())) {
                            logger.trace("Creating Resource("+value+")");
                            mapBindingSet.addBinding(path.getKey(), VF.createIRI(value));
                        }
    
                        else {
                            logger.trace("Creating Literal("+value+", "+iriType+")");
                            mapBindingSet.addBinding(path.getKey(),  VF.createLiteral(value, iriType));
                        }
                    }
                    else {
                        logger.trace("Missing type, Creating Literal("+value+", "+XSD.STRING+")");
                        mapBindingSet.addBinding(path.getKey(), VF.createLiteral(value, XSD.STRING));
                    }   
                } 
            // If the requested parameter is not present in the returning set
            catch(PathNotFoundException e) {
                logger.error(e.getMessage());

                // Return an empty string binding
                logger.trace("Parameter not found. Returning empty parameter");
                mapBindingSet.addBinding(path.getKey(), VF.createLiteral("", XSD.STRING));
            }
                
            }
            bindingSets.add(mapBindingSet);
        }

        logger.trace("### [END] Parsing JSONArray ###");
        return bindingSets;
    }

    private Optional<Value> getType (Model model, String id) {
            
        // Get input json path for each input element
        return model
            .filter(null, SPL.PREDICATE_PROPERTY , SimpleValueFactory.getInstance().createIRI(id))
            .stream()
            .map(Statement::getSubject)
            .map(sub -> model.filter(sub, SPL.VALUE_TYPE_PROPERTY, null).stream().findFirst().orElse(null))
            .map(Statement::getObject)
            .findFirst();
    }

    /**
     * 
     * This function iterate over jsonPaths and evaluate each against the JSON object structured as a map 
     * 
     * @param map
     * @param jsonPaths
     * @return
     */
    private List<BindingSet> iterateJsonMap (Map map, Map<String, String> jsonPaths) {

        logger.trace("### [START] Parsing JSONObject ###");
       
        List<BindingSet> bindingSets = Lists.newArrayList(); 
        MapBindingSet mapBindingSet = new MapBindingSet();
        
        for(Map.Entry<String, String> path : jsonPaths.entrySet()) {

            logger.trace("Parsing " + path.getValue());

            try {

                Object object = JsonPath.read(map, path.getValue());

                Optional<Value> type = getType(getSail().getServiceDescriptor().getModel(), MpRepositoryVocabulary.NAMESPACE.concat("_").concat(path.getKey()));
                String value = JsonPath.read(object, path.getValue()).toString();

                // If there is type check if it is a resource or a literal
                if(type.isPresent()) {

                    IRI iriType = VF.createIRI(type.get().stringValue());

                    if(StringUtils.equals(iriType.stringValue() , RDFS.RESOURCE.stringValue())) {
                        logger.trace("Creating Resource("+value+")");
                        mapBindingSet.addBinding(path.getKey(), VF.createIRI(value));
                    }

                    else {
                        logger.trace("Creating Literal("+value+", "+iriType+")");
                        mapBindingSet.addBinding(path.getKey(),  VF.createLiteral(value, iriType));
                    }
                }
                else {
                    logger.trace("Missing type, Creating Literal("+value+", "+XSD.STRING+")");
                    mapBindingSet.addBinding(path.getKey(), VF.createLiteral(value, XSD.STRING));
                }   
            }
            // If the requested parameter is not present in the returning set
            catch(PathNotFoundException e) {
                logger.error(e.getMessage());

                // Return an empty string binding
                logger.trace("Parameter not found. Returning empty parameter");
                mapBindingSet.addBinding(path.getKey(), VF.createLiteral("", XSD.STRING));
            }
        }

        logger.trace("### [END] Parsing JSONArray ###");
        bindingSets.add(mapBindingSet);
        return bindingSets;
    }

    /**
     * 
     * @param outputVariables
     * @param model
     * 
     * @return Map containing a couple output variable name and its json path from
     *         the model
     */
    private Map<String, String> getJsonPaths(Map<IRI, String> outputVariables, Model model) {

        Map<String, String> jsonPaths = new HashMap<>();

        for (Map.Entry<IRI, String> output : outputVariables.entrySet())
            jsonPaths.put(output.getValue(),
                    getJsonPath(getSail().getMapOutputParametersByProperty().get(output.getKey()), model));

        return jsonPaths;
    }

    /**
     * Default implementation calling the API using an HTTP GET method. Parameters
     * are passed via URL. JSON expected as a result format.
     * 
     * @param parametersHolder
     * @return
     */
    @Override
    protected Response submit(RESTParametersHolder parametersHolder) {

        try {
            String httpMethod = getSail().getConfig().getHttpMethod();

            logger.trace("Creating request with HTTP METHOD: "+httpMethod);

            // Case with POST
            if (httpMethod.equals(HttpMethod.POST))
                return submitPost(parametersHolder);

            // Default case as GET
            return super.submit(parametersHolder);

        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * 
     * @param parameter
     * @param model
     * 
     *                  Filter the statements having the JSON path predicate and
     *                  return the one belonging to the matching parameter
     * 
     * @return The string describing the JSON path for the matching parameter
     */
    private String getJsonPath(Parameter parameter, Model model) {
        return model.filter(parameter.getRootNode(), MpRepositoryVocabulary.JSON_PATH, null).stream()
                .map(statement -> statement.getObject()).map(value -> value.stringValue()).findFirst().orElse("");
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {

        logger.trace("### [START] Parsing SPARQL query ###");

        RESTParametersHolder res = new RESTParametersHolder();

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
                logger.trace("------");
                logger.trace("Input value detected");
                logger.trace("Parameter: "+entry.getValue().getParameterName());
                logger.trace("Value: "+value.get().stringValue());
                res.getInputParameters().put(entry.getValue().getParameterName(), value.get().stringValue());
            }
        }

        for (Map.Entry<IRI, Parameter> entry : getSail().getMapOutputParametersByProperty().entrySet()) {

            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Var> value = RESTWrappingSailUtils.getObjectOutputVariable(stmtPatterns, subject.orElse(null),
                    entry.getKey());

            if (value.isPresent()) {
                logger.trace("------");
                logger.trace("Output value detected");
                logger.trace("IRI: "+entry.getKey());
                logger.trace("Name: "+value.get().getName());
                res.getOutputVariables().put(entry.getKey(), value.get().getName());
            }
                
        }

        logger.trace("### [END] Parsing SPARLQ query ###");

        return res;
    }

}
